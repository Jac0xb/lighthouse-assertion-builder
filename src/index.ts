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
  ResolvedAccount,
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

const umi = createUmi('https://api.devnet.solana.com');
umi.programs.add(createLighthouseProgram());

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

type Config = {
  [ProgramOwner.SYSTEM_PROGRAM]: (
    resolvedAccount: ResolvedSystemProgramAccount | ResolvedUnownedAccount
  ) => Strategy;
  [ProgramOwner.SPL_TOKEN_PROGRAM]: (
    resolvedAccount: ResolvedSplTokenProgramAccount
  ) => Strategy;
  [ProgramOwner.SPL_TOKEN_2022_PROGRAM]: (
    resolvedAccount: ResolvedSplTokenProgramAccount
  ) => Strategy;
  [ProgramOwner.SPL_STAKE_PROGRAM]: (
    resolvedAccount: ResolvedStakeProgramAccount
  ) => Strategy;
  [ProgramOwner.UPGRADEABLE_LOADER_PROGRAM]: (
    resolvedAccount: ResolvedUpgradeableLoaderAccount
  ) => Strategy;
  [ProgramOwner.UNKNOWN]: (resolvedAccount: ResolvedUnknownAccount) => Strategy;
};

const STRATEGY_CONFIG: Config = {
  [ProgramOwner.SPL_TOKEN_PROGRAM]: (
    resolvedAccount: ResolvedSplTokenProgramAccount | ResolvedUnownedAccount
  ) => {
    return {
      strategy: 'strict',
    };
  },
  [ProgramOwner.SPL_TOKEN_2022_PROGRAM]: (
    resolvedAccount: ResolvedSplTokenProgramAccount
  ) => {
    return {
      strategy: 'strict',
    };
  },
  [ProgramOwner.SYSTEM_PROGRAM]: (
    resolvedAccount: ResolvedSystemProgramAccount | ResolvedUnownedAccount
  ) => {
    if (resolvedAccount.accountInfo?.data.length ?? 0 > 0) {
      return {
        strategy: 'hashverify',
      };
    }

    return {
      strategy: 'tolerance',
      tolerancePercent: 2,
      inclusive: true,
    };
  },
  [ProgramOwner.SPL_STAKE_PROGRAM]: (
    resolvedAccount: ResolvedStakeProgramAccount
  ) => {
    return {
      strategy: 'strict',
    };
  },
  [ProgramOwner.UPGRADEABLE_LOADER_PROGRAM]: (
    resolvedAccount: ResolvedUpgradeableLoaderAccount
  ) => {
    return {
      strategy: 'strict',
    };
  },
  [ProgramOwner.UNKNOWN]: (resolvedAccount: ResolvedUnknownAccount) => {
    return {
      strategy: 'none',
    };
  },
};

const LOG_LEVEL_CONFIG = LogLevel.PlaintextMessage;

const TESTS = {
  programDataTestFn: async (connection: Connection, keypair: Keypair) => {
    const programAccount = await connection.getAccountInfo(
      new PublicKey('4hfLzjLWmopU5RjooM1SeKcNraAeyaG3aUs6TZg8em2R')
    );

    const program = deserializeUpgradeableLoaderState(programAccount!.data);

    if (program.__kind !== 'Program') {
      throw new Error('Program not found');
    }

    const tx = new VersionedTransaction(
      new TransactionMessage({
        instructions: [
          setUpgradeAuthorityInstruction(
            new PublicKey(program.programDataAddress),
            keypair.publicKey,
            null
          ),
        ],
        payerKey: keypair.publicKey,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      }).compileToV0Message()
    );

    const simulationResult = await connection.simulateTransaction(tx, {
      accounts: {
        encoding: 'base64',
        addresses: [program.programDataAddress],
      },
    });

    const injectedTx = await injectLighthouseIntoTransaction(connection, tx);

    const simulatedInjectionResult = await connection.simulateTransaction(
      injectedTx.injectedTx,
      {
        accounts: {
          encoding: 'base64',
          addresses: [program.programDataAddress],
        },
      }
    );

    console.log(simulatedInjectionResult);
  },
  programAccountTestFn: async (connection: Connection, keypair: Keypair) => {
    const programAccount = await connection.getAccountInfo(
      new PublicKey(LIGHTHOUSE_PROGRAM_ID)
    );

    const program = deserializeUpgradeableLoaderState(programAccount!.data);

    if (program.__kind !== 'Program') {
      throw new Error('Program not found');
    }
    const programData = await connection.getAccountInfo(
      new PublicKey(program.programDataAddress)
    );

    const programDataAccount = deserializeUpgradeableLoaderState(
      programData!.data
    );

    if (programDataAccount.__kind !== 'ProgramData') {
      throw new Error('ProgramData not found');
    }

    const tx = new VersionedTransaction(
      new TransactionMessage({
        instructions: [
          setUpgradeAuthorityInstruction(
            new PublicKey(program.programDataAddress),
            keypair.publicKey,
            null
          ),
        ],
        payerKey: keypair.publicKey,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      }).compileToV0Message()
    );

    const injectedTx = await injectLighthouseIntoTransaction(connection, tx);
    const simulatedInjectionResult = await connection.simulateTransaction(
      injectedTx.injectedTx,
      {
        accounts: {
          encoding: 'base64',
          addresses: [program.programDataAddress],
        },
      }
    );

    console.log(simulatedInjectionResult);
  },
  programBufferTestFn: async (connection: Connection, keypair: Keypair) => {
    const programBufferPubkey = new PublicKey(
      '8seWyeB8XJ3pfGo5aCFcsDjkbtiDvc25dVrMeZDJm9Yg'
    );

    const programBufferAcount = await connection.getAccountInfo(
      programBufferPubkey
    );

    const programBufferData = deserializeUpgradeableLoaderState(
      programBufferAcount!.data
    );

    if (programBufferData.__kind !== 'Buffer') {
      throw new Error('Program not found');
    }

    const newAccountSystemProgram = Keypair.generate();
    const newAccountUnknownProgram = Keypair.generate();

    const tx = new VersionedTransaction(
      new TransactionMessage({
        instructions: [
          setUpgradeAuthorityInstruction(
            new PublicKey(programBufferPubkey),
            keypair.publicKey,
            Keypair.generate().publicKey
          ),
          SystemProgram.createAccount({
            fromPubkey: keypair.publicKey,
            newAccountPubkey: newAccountSystemProgram.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(100),
            space: 100,
            programId: SystemProgram.programId,
          }),
          SystemProgram.createAccount({
            fromPubkey: keypair.publicKey,
            newAccountPubkey: newAccountUnknownProgram.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(
              1024 * 10
            ),
            space: 1024 * 10,
            programId: new PublicKey(
              'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'
            ),
          }),
        ],
        payerKey: keypair.publicKey,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      }).compileToV0Message()
    );

    const injectedTx = await injectLighthouseIntoTransaction(connection, tx);
    const simulatedInjectionResult = await connection.simulateTransaction(
      injectedTx.injectedTx,
      {
        accounts: {
          encoding: 'base64',
          addresses: [programBufferPubkey.toString()],
        },
      }
    );

    console.log(simulatedInjectionResult);
  },
  tokenAccountTestFn: async (connection: Connection, keypair: Keypair) => {
    // const { mintKeypair, transaction, ixs } = await createTokenMint(
    //   connection,
    //   keypair,
    //   0,
    //   10
    // );

    // const result = await sendAndConfirmTransaction(connection, transaction, [
    //   keypair,
    //   mintKeypair,
    // ]);

    // Token2022 Mint
    const mint = new PublicKey('FBjLBGbW67XnRnuEBdwDHTKvX9KAVK7bdGezPKQyzyK5');

    // Token Mint
    // const mint = new PublicKey('2mwvxq4hJ2cSiiE9dyQq8QsqbgYzoZTRhkrva5WvcdvE');

    // Token Mint (With freeze + close authority)
    // const mint = new PublicKey('AemyCg9jpbWyWzaWnYZhtbisr4HdtfBFJHf9bCSbBnNc');

    const mintAccount = (await connection.getAccountInfo(mint))!;

    const destination = Keypair.generate();

    const destTokenAccount = getAssociatedTokenAddressSync(
      mint,
      destination.publicKey,
      false,
      mintAccount.owner,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const sourceTokenAccount = getAssociatedTokenAddressSync(
      mint,
      keypair.publicKey,
      false,
      mintAccount.owner,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const createTokenAccountIx = createAssociatedTokenAccountInstruction(
      keypair.publicKey,
      destTokenAccount,
      destination.publicKey,
      mint,
      mintAccount.owner
    );

    createTokenAccountIx.keys.find((key) =>
      key.pubkey.equals(mint)
    )!.isWritable = true;

    const tx = new VersionedTransaction(
      new TransactionMessage({
        instructions: [
          SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: keypair.publicKey,
            lamports: 10,
          }),
          createTokenAccountIx,
          createTransferCheckedInstruction(
            sourceTokenAccount,
            mint,
            destTokenAccount,
            keypair.publicKey,
            5,
            0,
            undefined,
            mintAccount.owner
          ),
        ],
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        payerKey: keypair.publicKey,
      }).compileToV0Message()
    );

    await injectLighthouseIntoTransaction(connection, tx);
  },
};

(async () => {
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(fs.readFileSync('../program-deployer.json').toString())
    )
  );
  const connection = new Connection('https://api.devnet.solana.com');

  const stakeAccount = new PublicKey(
    '13eHLXbrESobSt7uYAj4sk1dVmk7xCew57KNzvEsRH3W'
  );

  const account = await connection.getAccountInfo(stakeAccount);

  const stakeState = deserializeStakeState(account!.data);

  if (stakeState.__kind !== 'Stake') {
    throw new Error('Stake account not found');
  }

  const createAuthorize = async (authorizationType: number) => {
    const newStaker = Keypair.generate();
    const stakeTx = StakeProgram.authorize({
      stakePubkey: stakeAccount,
      authorizedPubkey: keypair.publicKey,
      newAuthorizedPubkey: newStaker.publicKey,
      stakeAuthorizationType: {
        index: authorizationType,
      },
    });
    stakeTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    stakeTx.feePayer = keypair.publicKey;
    stakeTx.sign(keypair);

    return TransactionMessage.decompile(
      VersionedTransaction.deserialize(stakeTx.serialize()).message
    ).instructions[0];
  };

  const tx = new VersionedTransaction(
    new TransactionMessage({
      instructions: [await createAuthorize(0), await createAuthorize(1)],
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      payerKey: keypair.publicKey,
    }).compileToV0Message()
  );

  // tx.sign([keypair, newStaker]);

  console.log(Buffer.from(tx.serialize()).toString('base64'));

  const injectedTx = await injectLighthouseIntoTransaction(connection, tx);

  const simulatedInjectionResult = await connection.simulateTransaction(
    injectedTx.injectedTx,
    {
      accounts: {
        encoding: 'base64',
        addresses: [stakeAccount.toString()],
      },
    }
  );

  console.log(simulatedInjectionResult);
})();

async function injectLighthouseIntoTransaction(
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

  const additionalInstructions: TransactionInstruction[] = [];

  const simulationAccounts = simResult.value.accounts.map((account) =>
    fromSimulationAccountInfo(account)
  );

  let i = 0;
  for (const accountAddress of writeableAccounts) {
    const accountSnapshot = accountSnapshots[i];
    const accountSimulationSnapshot = simulationAccounts[i];

    const resolvedSimulationAccount = resolveAccount(
      accountAddress,
      accountSimulationSnapshot
    );

    console.log(
      accountAddress.toBase58(),
      resolvedSimulationAccount.programOwner
    );

    switch (resolvedSimulationAccount.programOwner) {
      case ProgramOwner.SPL_TOKEN_PROGRAM:
      case ProgramOwner.SPL_TOKEN_2022_PROGRAM: {
        if (resolvedSimulationAccount.accountType === 'account') {
          const strategyConfig = STRATEGY_CONFIG[
            resolvedSimulationAccount.programOwner
          ](resolvedSimulationAccount);

          switch (strategyConfig.strategy) {
            case 'hashverify':
              additionalInstructions.push(
                ...HashVerifyStrategy.buildAssertion(
                  resolvedSimulationAccount,
                  LOG_LEVEL_CONFIG
                )
              );
              break;
            case 'strict':
              additionalInstructions.push(
                ...TokenAccountStrategies.buildStrictAssertion(
                  resolvedSimulationAccount,
                  LOG_LEVEL_CONFIG
                )
              );
              break;
            case 'tolerance':
              additionalInstructions.push(
                ...TokenAccountStrategies.buildToleranceAssertion(
                  resolvedSimulationAccount,
                  LOG_LEVEL_CONFIG,
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
          const strategyConfig = STRATEGY_CONFIG[
            resolvedSimulationAccount.programOwner
          ](resolvedSimulationAccount);

          switch (strategyConfig.strategy) {
            case 'hashverify':
              additionalInstructions.push(
                ...HashVerifyStrategy.buildAssertion(
                  resolvedSimulationAccount,
                  LOG_LEVEL_CONFIG
                )
              );
              break;
            case 'strict':
              additionalInstructions.push(
                ...MintAccountStrategies.buildStrictAssertion(
                  resolvedSimulationAccount,
                  LOG_LEVEL_CONFIG
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
        const strategyConfig = STRATEGY_CONFIG[
          resolvedSimulationAccount.programOwner
        ](resolvedSimulationAccount);

        if (resolvedSimulationAccount.accountInfo === null) {
          throw new Error(`unimplemented`);
        } else {
          switch (strategyConfig.strategy) {
            case 'hashverify':
              additionalInstructions.push(
                ...HashVerifyStrategy.buildAssertion(
                  resolvedSimulationAccount,
                  LOG_LEVEL_CONFIG
                )
              );
              break;
            case 'strict':
              additionalInstructions.push(
                ...SystemProgramAccountStrategies.buildStrictAssertion(
                  resolvedSimulationAccount,
                  LOG_LEVEL_CONFIG
                )
              );
              break;
            case 'tolerance':
              additionalInstructions.push(
                ...SystemProgramAccountStrategies.buildToleranceAssertion(
                  resolvedSimulationAccount,
                  LOG_LEVEL_CONFIG,
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
        const strategyConfig = STRATEGY_CONFIG[
          resolvedSimulationAccount.programOwner
        ](resolvedSimulationAccount);

        switch (strategyConfig.strategy) {
          case 'hashverify':
            additionalInstructions.push(
              ...HashVerifyStrategy.buildAssertion(
                resolvedSimulationAccount,
                LOG_LEVEL_CONFIG
              )
            );
            break;
          case 'strict':
            additionalInstructions.push(
              ...UpgradeableLoaderAccountStrategies.buildStrictAssertion(
                resolvedSimulationAccount,
                LOG_LEVEL_CONFIG
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
        const strategyConfig = STRATEGY_CONFIG[
          resolvedSimulationAccount.programOwner
        ](resolvedSimulationAccount);

        switch (strategyConfig.strategy) {
          case 'hashverify':
            additionalInstructions.push(
              ...HashVerifyStrategy.buildAssertion(
                resolvedSimulationAccount,
                LOG_LEVEL_CONFIG
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
        const strategyConfig = STRATEGY_CONFIG[
          resolvedSimulationAccount.programOwner
        ](resolvedSimulationAccount);

        switch (strategyConfig.strategy) {
          case 'hashverify':
            additionalInstructions.push(
              ...HashVerifyStrategy.buildAssertion(
                resolvedSimulationAccount,
                LOG_LEVEL_CONFIG
              )
            );
            break;
          case 'strict':
            additionalInstructions.push(
              ...StakeProgramAccountStrategies.buildStrictAssertion(
                resolvedSimulationAccount,
                LOG_LEVEL_CONFIG
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
  decompiledMessage.instructions.push(...additionalInstructions);
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
    additionalInstructions,
    injectedTx: decompiledTx,
  };
}

async function getWriteablesAndSigners(tx: VersionedTransaction) {
  const signerAccounts: Set<PublicKey> = new Set();
  const writeableAccounts: Set<PublicKey> = new Set();

  const accountKeys = tx.message.staticAccountKeys;

  for (const instruction of tx.message.compiledInstructions) {
    for (const accountIdx of instruction.accountKeyIndexes) {
      const account = accountKeys[accountIdx];

      if (tx.message.isAccountWritable(accountIdx)) {
        writeableAccounts.add(account);
      }

      if (tx.message.isAccountSigner(accountIdx)) {
        writeableAccounts.add(account);
        signerAccounts.add(account);
      }
    }
  }

  signerAccounts.add(tx.message.staticAccountKeys[0]);

  return {
    writeableAccounts: [...writeableAccounts],
    signerAccounts: [...signerAccounts],
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

export function deserializeInstruction(instructionData: Buffer) {
  const discriminator = instructionData.readUInt8(0);

  switch (discriminator) {
    case 0:
      return {
        name: 'MemoryWrite',
        data: getMemoryWriteInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };

    case 1:
      return {
        name: 'MemoryClose',
        data: getMemoryCloseInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 2:
      return {
        name: 'AssertAccountData',
        data: getAssertAccountDataInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 3:
      return {
        name: 'AssertAccountDelta',
        data: getAssertAccountDeltaInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 4:
      return {
        name: 'AssertAccountInfo',
        data: getAssertAccountInfoInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 5:
      return {
        name: 'AssertAccountInfoMulti',
        data: getAssertAccountInfoMultiInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 6:
      return {
        name: 'AssertMintAccount',
        data: getAssertMintAccountInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 7: {
      return {
        name: 'AssertMintAccountMulti',
        data: getAssertMintAccountMultiInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    }
    case 8:
      return {
        name: 'AssertTokenAccount',
        data: getAssertAccountDataInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 9:
      return {
        name: 'AssertTokenAccountMulti',
        data: getAssertTokenAccountMultiInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 10:
      return {
        name: 'AssertStakeAccount',
        data: getMemoryWriteInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 11:
      return {
        name: 'AssertStakeAccountMulti',
        data: getAssertStakeAccountMultiInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 12:
      return {
        name: 'AssertUpgradeableLoaderAccount',
        data: getMemoryWriteInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 13:
      return {
        name: 'AssertUpgradeableLoaderAccountMulti',
        data: getAssertUpgradeableLoaderAccountMultiInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 14:
      return {
        name: 'AssertSysvarClock',
        data: getAssertSysvarClockInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 15:
      return {
        name: 'AssertMerkleTreeAccount',
        data: getAssertMerkleTreeAccountInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 16:
      return {
        name: 'AssertBubblegumTreeConfigAccount',
        data: getAssertBubblegumTreeConfigAccountInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
  }
}
