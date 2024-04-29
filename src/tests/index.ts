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
} from '../resolvedAccount';
import { TokenAccountStrategies } from '../strategyBuilders/tokenProgram/tokenAccount';
import { MintAccountStrategies } from '../strategyBuilders/tokenProgram/mintAccount';
import { SystemProgramAccountStrategies } from '../strategyBuilders/systemProgram/account';
import { deserializeUpgradeableLoaderState } from '../utils/serializer/upgradeableProgramAccount';
import { setUpgradeAuthorityInstruction } from '../utils/serializer/upgradeableProgramAccount/instructions';
import { UpgradeableLoaderAccountStrategies } from '../strategyBuilders/upgradeableLoaderProgram/account';
import { HashVerifyStrategy } from '../strategyBuilders/hashVerify';
import {
  StakeAuthorize,
  authorizeCheckedInstruction,
  deserializeStakeState,
} from '../utils/serializer/stakeProgramAccount';
import { base64 } from '@metaplex-foundation/umi/serializers';
import { StakeProgramAccountStrategies } from '../strategyBuilders/stakeProgram/account';
import { injectLighthouseIntoTransaction } from '../lighthouseInjection';

export const programDataTest = async (
  connection: Connection,
  keypair: Keypair
) => {
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
};

// export const programAccountTest = async (
//   connection: Connection,
//   keypair: Keypair
// ) => {
//   const programAccount = await connection.getAccountInfo(
//     new PublicKey(LIGHTHOUSE_PROGRAM_ID)
//   );

//   const program = deserializeUpgradeableLoaderState(programAccount!.data);

//   if (program.__kind !== 'Program') {
//     throw new Error('Program not found');
//   }
//   const programData = await connection.getAccountInfo(
//     new PublicKey(program.programDataAddress)
//   );

//   const programDataAccount = deserializeUpgradeableLoaderState(
//     programData!.data
//   );

//   if (programDataAccount.__kind !== 'ProgramData') {
//     throw new Error('ProgramData not found');
//   }

//   const tx = new VersionedTransaction(
//     new TransactionMessage({
//       instructions: [
//         setUpgradeAuthorityInstruction(
//           new PublicKey(program.programDataAddress),
//           keypair.publicKey,
//           null
//         ),
//       ],
//       payerKey: keypair.publicKey,
//       recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
//     }).compileToV0Message()
//   );

//   const injectedTx = await injectLighthouseIntoTransaction(connection, tx);
//   const simulatedInjectionResult = await connection.simulateTransaction(
//     injectedTx.injectedTx,
//     {
//       accounts: {
//         encoding: 'base64',
//         addresses: [program.programDataAddress],
//       },
//     }
//   );

//   console.log(simulatedInjectionResult);
// };
