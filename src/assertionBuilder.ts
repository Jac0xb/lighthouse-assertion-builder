import {
  AccountInfo,
  AddressLookupTableAccount,
  Connection,
  Message,
  PublicKey,
  RpcResponseAndContext,
  SimulatedTransactionAccountInfo,
  TransactionInstruction,
  TransactionMessage,
  VersionedMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { LogLevel } from 'lighthouse-sdk-legacy';
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
import { UpgradeableLoaderAccountStrategies } from './strategyBuilders/upgradeableLoaderProgram/account';
import { HashVerifyStrategy } from './strategyBuilders/hashVerify';
import { StakeProgramAccountStrategies } from './strategyBuilders/stakeProgram/account';

export type StrategyName = 'strict' | 'tolerance' | 'hashverify' | 'none';
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

/**
 *  Builds an assertions by running simulation analysis and generating assertions based on given strategy in AssertionBuilderConfig
 **/
export async function buildLighthouseAssertion(
  config: AssertionBuilderConfig,
  logLevel: LogLevel,
  connection: Connection,
  tx: VersionedTransaction
): Promise<{
  overhead: number;
  preTxLength: number;
  postTxLength: number;
  injectionIxs: TransactionInstruction[];
  injectedTx: VersionedTransaction;
  accounts: {
    [key: string]: {
      simulationAccount: AccountInfo<Buffer> | null;
      resolvedSimulationAccount: ResolvedAccount;
      appliedStrategy?: Strategy | undefined;
    };
  };
}> {
  const { writeableAccounts } = await getWriteablesAndSigners(connection, tx);
  const simResult = await connection.simulateTransaction(tx, {
    accounts: {
      encoding: 'base64',
      addresses: writeableAccounts.map((account) => account.toBase58()),
    },
  });

  if (simResult.value.err) {
    throw new Error(`Simulation failed ${JSON.stringify(simResult)}`);
  } else if (writeableAccounts.length !== simResult.value.accounts?.length) {
    throw new Error(
      `Simulation != expected account lengths got ${simResult.value.accounts?.length} expected ${writeableAccounts.length}`
    );
  }

  const injectionIxs: TransactionInstruction[] = [];
  const simulationAccounts = simResult.value.accounts.map((account) =>
    fromSimulationAccountInfo(account)
  );

  const accounts: {
    [key: string]: {
      simulationAccount: AccountInfo<Buffer> | null;
      resolvedSimulationAccount: ResolvedAccount;
      appliedStrategy?: Strategy;
    };
  } = {};

  // Take writable accounts and resolve the program owner + deserialize their account state + build assertion based on strategy.
  for (let i = 0; i < writeableAccounts.length; i++) {
    const accountAddress = writeableAccounts[i];
    const accountSimulationSnapshot = simulationAccounts[i];

    const resolvedSimulationAccount = resolveAccount(
      accountAddress,
      accountSimulationSnapshot
    );

    accounts[accountAddress.toBase58()] = {
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

          if (strategyConfig.strategy === 'hashverify') {
            injectionIxs.push(
              ...HashVerifyStrategy.buildAssertion(
                resolvedSimulationAccount,
                logLevel
              )
            );
          } else if (strategyConfig.strategy === 'strict') {
            injectionIxs.push(
              ...TokenAccountStrategies.buildStrictAssertion(
                resolvedSimulationAccount,
                logLevel
              )
            );
          } else if (strategyConfig.strategy === 'tolerance') {
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
          } else if (strategyConfig.strategy === 'none') {
          }
        } else if (resolvedSimulationAccount.accountType === 'mint') {
          const strategyConfig = config[
            resolvedSimulationAccount.programOwner
          ]!(resolvedSimulationAccount);

          if (strategyConfig.strategy === 'hashverify') {
            injectionIxs.push(
              ...HashVerifyStrategy.buildAssertion(
                resolvedSimulationAccount,
                logLevel
              )
            );
          } else if (strategyConfig.strategy === 'strict') {
            injectionIxs.push(
              ...MintAccountStrategies.buildStrictAssertion(
                resolvedSimulationAccount,
                logLevel
              )
            );
          } else if (strategyConfig.strategy === 'tolerance') {
            throw new Error(
              `Unimplemented strategy ${
                strategyConfig.strategy
              } for Token Account ${resolvedSimulationAccount.address.toBase58()}`
            );
          }
        }

        break;
      }
      case ProgramOwner.SYSTEM_PROGRAM: {
        const strategyConfig = config[resolvedSimulationAccount.programOwner]!(
          resolvedSimulationAccount
        );

        if (strategyConfig.strategy === 'hashverify') {
          injectionIxs.push(
            ...HashVerifyStrategy.buildAssertion(
              resolvedSimulationAccount,
              logLevel
            )
          );
        } else if (strategyConfig.strategy === 'strict') {
          injectionIxs.push(
            ...SystemProgramAccountStrategies.buildStrictAssertion(
              resolvedSimulationAccount,
              logLevel
            )
          );
        } else if (strategyConfig.strategy === 'tolerance') {
          injectionIxs.push(
            ...SystemProgramAccountStrategies.buildToleranceAssertion(
              resolvedSimulationAccount,
              logLevel,
              {
                tolerancePercentage: strategyConfig.tolerancePercent,
              }
            )
          );
        }

        break;
      }
      case ProgramOwner.UPGRADEABLE_LOADER_PROGRAM: {
        const strategyConfig = config[resolvedSimulationAccount.programOwner]!(
          resolvedSimulationAccount
        );

        if (strategyConfig.strategy === 'hashverify') {
          injectionIxs.push(
            ...HashVerifyStrategy.buildAssertion(
              resolvedSimulationAccount,
              logLevel
            )
          );
        } else if (strategyConfig.strategy === 'strict') {
          injectionIxs.push(
            ...UpgradeableLoaderAccountStrategies.buildStrictAssertion(
              resolvedSimulationAccount,
              logLevel
            )
          );
        } else if (strategyConfig.strategy === 'tolerance') {
          throw new Error(
            `Unimplemented strategy ${
              strategyConfig.strategy
            } for Upgradeable Loader ${resolvedSimulationAccount.address.toBase58()}`
          );
        }

        break;
      }
      case ProgramOwner.UNKNOWN: {
        const strategyConfig = config[resolvedSimulationAccount.programOwner]!(
          resolvedSimulationAccount
        );

        if (strategyConfig.strategy === 'hashverify') {
          injectionIxs.push(
            ...HashVerifyStrategy.buildAssertion(
              resolvedSimulationAccount,
              logLevel
            )
          );
        } else if (
          strategyConfig.strategy === 'strict' ||
          strategyConfig.strategy === 'tolerance'
        ) {
          throw new Error(
            `Unimplemented strategy ${
              strategyConfig.strategy
            } for Unknown Account ${resolvedSimulationAccount.address.toBase58()}`
          );
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
        throw new Error(`Unknown program owner ${resolvedSimulationAccount}`);
    }
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

async function getWriteablesAndSigners(
  connection: Connection,
  tx: VersionedTransaction
) {
  const signerAccounts: Set<String> = new Set();
  const writeableAccounts: Set<String> = new Set();

  const accountKeys = await getAccountKeysFromMessage(connection, tx.message);

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

export async function getAccountKeysFromMessage(
  connection: Connection,
  message: VersionedMessage
): Promise<PublicKey[]> {
  if (message instanceof Message) {
    return message.accountKeys;
  }

  if (message.numAccountKeysFromLookups === 0) {
    return message.staticAccountKeys;
  }

  const lookupTable = await Promise.all(
    message.addressTableLookups.map((lookup) =>
      connection.getAddressLookupTable(lookup.accountKey)
    )
  );

  const validLookups = (
    lookupTable.filter(
      (lookup) => lookup.value !== null
    ) as RpcResponseAndContext<AddressLookupTableAccount>[]
  ).map((lookup) => lookup.value);

  return message
    .getAccountKeys({
      addressLookupTableAccounts: validLookups,
    })
    .keySegments()
    .flat();
}
