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
} from '../../resolvedAccount';
import { TokenAccountStrategies } from '../../strategyBuilders/tokenProgram/tokenAccount';
import { MintAccountStrategies } from '../../strategyBuilders/tokenProgram/mintAccount';
import { SystemProgramAccountStrategies } from '../../strategyBuilders/systemProgram/account';
import { deserializeUpgradeableLoaderState } from '../../utils/serializer/upgradeableProgramAccount';
import { setUpgradeAuthorityInstruction } from '../../utils/serializer/upgradeableProgramAccount/instructions';
import { UpgradeableLoaderAccountStrategies } from '../../strategyBuilders/upgradeableLoaderProgram/account';
import { HashVerifyStrategy } from '../../strategyBuilders/hashVerify';
import {
  StakeAuthorize,
  authorizeCheckedInstruction,
  deserializeStakeState,
} from '../../utils/serializer/stakeProgramAccount';
import { base64 } from '@metaplex-foundation/umi/serializers';
import { StakeProgramAccountStrategies } from '../../strategyBuilders/stakeProgram/account';
import { injectLighthouseIntoTransaction } from '../../lighthouseInjection';

export const programDataAuthorityChangeGuardTest = async (
  connection: Connection
) => {
  const signer = new PublicKey('5B6svuwWuW9w8Y2a868Mf6xDvqjCHkmrYByUyggi7ioj');
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
          signer,
          null
        ),
      ],
      payerKey: signer,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    }).compileToV0Message()
  );

  const simulationResult = await connection.simulateTransaction(tx, {
    accounts: {
      encoding: 'base64',
      addresses: [program.programDataAddress],
    },
  });

  const injectedTx = await injectLighthouseIntoTransaction(
    {
      [ProgramOwner.UPGRADEABLE_LOADER_PROGRAM]: () => ({
        strategy: 'strict',
      }),
      [ProgramOwner.SYSTEM_PROGRAM]: () => ({
        strategy: 'strict',
      }),
    },
    LogLevel.PlaintextMessage,
    connection,
    tx
  );

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

export const programBufferAuthorityChangeGuardTest = async (
  connection: Connection
) => {
  const signer = new PublicKey('5B6svuwWuW9w8Y2a868Mf6xDvqjCHkmrYByUyggi7ioj');
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
          signer,
          Keypair.generate().publicKey
        ),
        SystemProgram.createAccount({
          fromPubkey: signer,
          newAccountPubkey: newAccountSystemProgram.publicKey,
          lamports: await connection.getMinimumBalanceForRentExemption(100),
          space: 100,
          programId: SystemProgram.programId,
        }),
        SystemProgram.createAccount({
          fromPubkey: signer,
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
      payerKey: signer,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    }).compileToV0Message()
  );

  const injectedTx = await injectLighthouseIntoTransaction(
    {
      [ProgramOwner.UPGRADEABLE_LOADER_PROGRAM]: () => ({
        strategy: 'strict',
      }),
      [ProgramOwner.SYSTEM_PROGRAM]: () => ({
        strategy: 'strict',
      }),
      [ProgramOwner.UNKNOWN]: () => ({
        strategy: 'hashverify',
      }),
    },
    LogLevel.PlaintextMessage,
    connection,
    tx
  );
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
};
