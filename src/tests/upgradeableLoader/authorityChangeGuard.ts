import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { LogLevel } from 'lighthouse-sdk-legacy';
import { ProgramOwner } from '../../resolvedAccount';
import { deserializeUpgradeableLoaderState } from '../../utils/serializer/upgradeableProgramAccount';
import { setUpgradeAuthorityInstruction } from '../../utils/serializer/upgradeableProgramAccount/instructions';
import { buildLighthouseAssertion } from '../../assertionBuilder';

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

  const injectedTx = await buildLighthouseAssertion(
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
    injectedTx.injectedTx
  );

  // console.log(inspect(injectionResults, false, null, true));
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
      ],
      payerKey: signer,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    }).compileToV0Message()
  );

  const injectedTx = await buildLighthouseAssertion(
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
    injectedTx.injectedTx
  );

  // console.log(inspect(injectionResults, false, null, true));
  console.log(simulatedInjectionResult);
};
