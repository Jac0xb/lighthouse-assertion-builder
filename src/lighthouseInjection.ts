import {
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
} from '@solana/spl-token';
import fs from 'fs';
import {
  AccountInfo,
  Connection,
  Keypair,
  PublicKey,
  SimulatedTransactionAccountInfo,
  StakeProgram,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  LIGHTHOUSE_PROGRAM_ID,
  LogLevel,
  getAssertAccountDataInstructionDataSerializer,
  getAssertAccountDeltaInstructionDataSerializer,
  getAssertAccountInfoInstructionDataSerializer,
  getAssertAccountInfoMultiInstructionDataSerializer,
  getAssertBubblegumTreeConfigAccountInstructionDataSerializer,
  getAssertMerkleTreeAccountInstructionDataSerializer,
  getAssertMintAccountInstructionDataSerializer,
  getAssertMintAccountMultiInstructionDataSerializer,
  getAssertStakeAccountMultiInstructionDataSerializer,
  getAssertSysvarClockInstructionDataSerializer,
  getAssertTokenAccountMultiInstructionDataSerializer,
  getAssertUpgradeableLoaderAccountMultiInstructionDataSerializer,
  getMemoryCloseInstructionDataSerializer,
  getMemoryWriteInstructionDataSerializer,
} from 'lighthouse-sdk-legacy';

import { createLighthouseProgram } from 'lighthouse-sdk-legacy';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  ProgramOwner,
  ResolvedAccount,
  ResolvedSplTokenProgramAccount,
  ResolvedStakeProgramAccount,
  ResolvedSystemProgramAccount,
  ResolvedUnknownAccount,
  ResolvedUnownedAccount,
  ResolvedUpgradeableLoaderAccount,
  resolveAccount,
} from './resolvedAccount';
import { TokenAccountStrategies } from './strategyBuilders/tokenProgram/tokenAccount';
import { MintAccountStrategies } from './strategyBuilders/tokenProgram/mintAccount';
import { SystemProgramAccountStrategies } from './strategyBuilders/systemProgram/account';
import { deserializeUpgradeableLoaderState } from './utils/serializer/upgradeableProgramAccount';
import { setUpgradeAuthorityInstruction } from './utils/serializer/upgradeableProgramAccount/instructions';
import { UpgradeableLoaderAccountStrategies } from './strategyBuilders/upgradeableLoaderProgram/account';
import { HashVerifyStrategy } from './strategyBuilders/hashVerify';
import {
  StakeAuthorize,
  authorizeCheckedInstruction,
  deserializeStakeState,
} from './utils/serializer/stakeProgramAccount';
import { base64 } from '@metaplex-foundation/umi/serializers';
import { StakeProgramAccountStrategies } from './strategyBuilders/stakeProgram/account';

type StrategyName = 'strict' | 'tolerance' | 'hashverify' | 'none';
type Strategy =
  | StrictStrategy
  | ToleranceStrategy
  | HashVerifyStrategy
  | NoneStrategy;

type NoneStrategy = {
  strategy: 'none';
};

type StrictStrategy = {
  strategy: 'strict';
};

type ToleranceStrategy = {
  strategy: 'tolerance';
  tolerancePercent: number;
  inclusive: boolean;
};

type HashVerifyStrategy = {
  strategy: 'hashverify';
};

export type AssertionBuilderConfig = {
  [ProgramOwner.SYSTEM_PROGRAM]?: (
    resolvedAccount: ResolvedSystemProgramAccount | ResolvedUnownedAccount
  ) => Strategy;
  [ProgramOwner.SPL_TOKEN_PROGRAM]?: (
    resolvedAccount: ResolvedSplTokenProgramAccount
  ) => Strategy;
  [ProgramOwner.SPL_TOKEN_2022_PROGRAM]?: (
    resolvedAccount: ResolvedSplTokenProgramAccount
  ) => Strategy;
  [ProgramOwner.SPL_STAKE_PROGRAM]?: (
    resolvedAccount: ResolvedStakeProgramAccount
  ) => Strategy;
  [ProgramOwner.UPGRADEABLE_LOADER_PROGRAM]?: (
    resolvedAccount: ResolvedUpgradeableLoaderAccount
  ) => Strategy;
  [ProgramOwner.UNKNOWN]?: (
    resolvedAccount: ResolvedUnknownAccount
  ) => Strategy;
};

export function createDefaultConfig(): AssertionBuilderConfig {
  return {};
}

export async function injectLighthouseIntoTransaction(
  config: AssertionBuilderConfig,
  logLevel: LogLevel,
  connection: Connection,
  tx: VersionedTransaction
) {
  const { writeableAccounts, signerAccounts } = await getWriteablesAndSigners(
    tx
  );

  const simResult = await connection.simulateTransaction(tx, {
    accounts: {
      encoding: 'base64',
      addresses: writeableAccounts.map((account) => account.toBase58()),
    },
  });

  if (simResult.value.err) {
    throw new Error(`Simulation failed ${JSON.stringify(simResult)}`);
  }

  if (writeableAccounts.length !== simResult.value.accounts?.length) {
    throw new Error(
      `Simulation != expected account lengths got ${simResult.value.accounts?.length} expected ${writeableAccounts.length}`
    );
  }

  const accountSnapshots = await connection.getMultipleAccountsInfo(
    writeableAccounts,
    'confirmed'
  );

  const injectionIxs: TransactionInstruction[] = [];

  const simulationAccounts = simResult.value.accounts.map((account) =>
    fromSimulationAccountInfo(account)
  );

  const accounts: {
    [key: string]: {
      account: AccountInfo<Buffer> | null;
      simulationAccount: AccountInfo<Buffer> | null;
      resolvedSimulationAccount: ResolvedAccount;
      appliedStrategy?: Strategy;
    };
  } = {};

  let i = 0;
  for (const accountAddress of writeableAccounts) {
    const accountSnapshot = accountSnapshots[i];
    const accountSimulationSnapshot = simulationAccounts[i];

    const resolvedSimulationAccount = resolveAccount(
      accountAddress,
      accountSimulationSnapshot
    );

    accounts[accountAddress.toBase58()] = {
      account: accountSnapshot,
      simulationAccount: accountSimulationSnapshot,
      resolvedSimulationAccount,
    };

    if (config[resolvedSimulationAccount.programOwner] === undefined) {
      throw new Error(
        `No strategy defined for program owner ${resolvedSimulationAccount.programOwner}`
      );
    }

    const strategy = config[resolvedSimulationAccount.programOwner];
    if (strategy === undefined) {
      throw new Error(
        `No strategy defined for program owner ${resolvedSimulationAccount.programOwner}`
      );
    }

    accounts[accountAddress.toBase58()].appliedStrategy = strategy(
      resolvedSimulationAccount as any
    );

    switch (resolvedSimulationAccount.programOwner) {
      case ProgramOwner.SPL_TOKEN_PROGRAM:
      case ProgramOwner.SPL_TOKEN_2022_PROGRAM: {
        if (resolvedSimulationAccount.accountType === 'account') {
          const strategyConfig = config[
            resolvedSimulationAccount.programOwner
          ]!(resolvedSimulationAccount);

          switch (strategyConfig.strategy) {
            case 'hashverify':
              injectionIxs.push(
                ...HashVerifyStrategy.buildAssertion(
                  resolvedSimulationAccount,
                  logLevel
                )
              );
              break;
            case 'strict':
              injectionIxs.push(
                ...TokenAccountStrategies.buildStrictAssertion(
                  resolvedSimulationAccount,
                  logLevel
                )
              );
              break;
            case 'tolerance':
              injectionIxs.push(
                ...TokenAccountStrategies.buildToleranceAssertion(
                  resolvedSimulationAccount,
                  logLevel,
                  {
                    tolerancePercent: strategyConfig.tolerancePercent,
                    inclusive: strategyConfig.inclusive,
                  }
                )
              );
              break;
            default:
              throw new Error('unimplemented');
          }
        } else if (resolvedSimulationAccount.accountType === 'mint') {
          const strategyConfig = config[
            resolvedSimulationAccount.programOwner
          ]!(resolvedSimulationAccount);

          switch (strategyConfig.strategy) {
            case 'hashverify':
              injectionIxs.push(
                ...HashVerifyStrategy.buildAssertion(
                  resolvedSimulationAccount,
                  logLevel
                )
              );
              break;
            case 'strict':
              injectionIxs.push(
                ...MintAccountStrategies.buildStrictAssertion(
                  resolvedSimulationAccount,
                  logLevel
                )
              );
              break;
            case 'tolerance':
            default:
              throw new Error('Not implemented');
          }
        }
        break;
      }
      case ProgramOwner.SYSTEM_PROGRAM: {
        const strategyConfig = config[resolvedSimulationAccount.programOwner]!(
          resolvedSimulationAccount
        );

        if (resolvedSimulationAccount.accountInfo === null) {
          throw new Error(`unimplemented`);
        } else {
          switch (strategyConfig.strategy) {
            case 'hashverify':
              injectionIxs.push(
                ...HashVerifyStrategy.buildAssertion(
                  resolvedSimulationAccount,
                  logLevel
                )
              );
              break;
            case 'strict':
              injectionIxs.push(
                ...SystemProgramAccountStrategies.buildStrictAssertion(
                  resolvedSimulationAccount,
                  logLevel
                )
              );
              break;
            case 'tolerance':
              injectionIxs.push(
                ...SystemProgramAccountStrategies.buildToleranceAssertion(
                  resolvedSimulationAccount,
                  logLevel,
                  {
                    tolerancePercentage: strategyConfig.tolerancePercent,
                  }
                )
              );
              break;
            default:
              throw new Error('unimplemented');
          }
        }
        break;
      }
      case ProgramOwner.UPGRADEABLE_LOADER_PROGRAM: {
        const strategyConfig = config[resolvedSimulationAccount.programOwner]!(
          resolvedSimulationAccount
        );

        switch (strategyConfig.strategy) {
          case 'hashverify':
            injectionIxs.push(
              ...HashVerifyStrategy.buildAssertion(
                resolvedSimulationAccount,
                logLevel
              )
            );
            break;
          case 'strict':
            injectionIxs.push(
              ...UpgradeableLoaderAccountStrategies.buildStrictAssertion(
                resolvedSimulationAccount,
                logLevel
              )
            );
            break;
          case 'tolerance':
          default:
            throw new Error('Not implemented');
        }
        break;
      }
      case ProgramOwner.UNKNOWN: {
        const strategyConfig = config[resolvedSimulationAccount.programOwner]!(
          resolvedSimulationAccount
        );

        switch (strategyConfig.strategy) {
          case 'hashverify':
            injectionIxs.push(
              ...HashVerifyStrategy.buildAssertion(
                resolvedSimulationAccount,
                logLevel
              )
            );
            break;
          case 'none':
            break;
          default:
          case 'strict':
          case 'tolerance':
            throw new Error('Not implemented');
        }
        break;
      }
      case ProgramOwner.SPL_STAKE_PROGRAM: {
        const strategyConfig = config[resolvedSimulationAccount.programOwner]!(
          resolvedSimulationAccount
        );

        switch (strategyConfig.strategy) {
          case 'hashverify':
            injectionIxs.push(
              ...HashVerifyStrategy.buildAssertion(
                resolvedSimulationAccount,
                logLevel
              )
            );
            break;
          case 'strict':
            injectionIxs.push(
              ...StakeProgramAccountStrategies.buildStrictAssertion(
                resolvedSimulationAccount,
                logLevel
              )
            );
            break;
          case 'tolerance':
            throw new Error('Not implemented');
        }

        break;
      }
      default:
        throw new Error('unimplemented programowner');
    }

    i++;
  }

  const decompiledMessage = TransactionMessage.decompile(tx.message);
  decompiledMessage.instructions.push(...injectionIxs);
  const decompiledTx = new VersionedTransaction(
    decompiledMessage.compileToV0Message()
  );

  const meta = {
    preTxLength: tx.serialize().length,
    postTxLength: decompiledTx.serialize().length,
  };

  return {
    ...meta,
    overhead: meta.postTxLength - meta.preTxLength,
    injectionIxs,
    injectedTx: decompiledTx,
    accounts,
  };
}

async function getWriteablesAndSigners(tx: VersionedTransaction) {
  const signerAccounts: Set<String> = new Set();
  const writeableAccounts: Set<String> = new Set();

  const accountKeys = tx.message.staticAccountKeys;

  for (const instruction of tx.message.compiledInstructions) {
    for (const accountIdx of instruction.accountKeyIndexes) {
      const account = accountKeys[accountIdx];

      if (tx.message.isAccountWritable(accountIdx)) {
        writeableAccounts.add(account.toBase58());
      }

      if (tx.message.isAccountSigner(accountIdx)) {
        writeableAccounts.add(account.toBase58());
        signerAccounts.add(account.toBase58());
      }
    }
  }

  signerAccounts.add(tx.message.staticAccountKeys[0].toBase58());

  return {
    writeableAccounts: [...writeableAccounts].map(
      (account) => new PublicKey(account)
    ),
    signerAccounts: [...signerAccounts].map(
      (account) => new PublicKey(account)
    ),
  };
}

export function fromSimulationAccountInfo(
  account: SimulatedTransactionAccountInfo | null
): AccountInfo<Buffer> | null {
  if (!account) {
    return null;
  }

  return {
    executable: account.executable,
    lamports: account.lamports,
    owner: new PublicKey(account.owner),
    data: Buffer.from(account.data[0], 'base64'),
  };
}
