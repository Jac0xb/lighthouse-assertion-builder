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
import { buildLighthouseAssertion } from '../../assertionBuilder';

export const unknownAccountHashVerifyStrategyTest = async (
  connection: Connection
) => {
  const signer = new PublicKey('5B6svuwWuW9w8Y2a868Mf6xDvqjCHkmrYByUyggi7ioj');

  const newAccountSystemProgram = Keypair.generate();
  const newAccountUnknownProgram = Keypair.generate();

  const tx = new VersionedTransaction(
    new TransactionMessage({
      instructions: [
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

  const injectionResults = await buildLighthouseAssertion(
    {
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
    injectionResults.injectedTx
  );

  console.log('Overhead (bytes): ', injectionResults.overhead);
  console.log(simulatedInjectionResult);
};
