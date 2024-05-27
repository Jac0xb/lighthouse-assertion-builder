import {
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
  SystemProgram,
} from '@solana/web3.js';
import { ProgramOwner } from '../../resolvedAccount';
import { buildLighthouseAssertion } from '../../assertionBuilder';
import { LogLevel } from 'lighthouse-sdk-legacy';
import { inspect } from 'util';

// Tests transfering tokens between two token2020 accounts (strict strategy)
export const tokenAccountToken2022MintStrictTest = async (
  connection: Connection
) => {
  // Token2022 Mint
  const signer = new PublicKey('w1kASebk8VWsLzAxnnsn9mWAt4CePA3dt9B6sUUjAEv');
  const mint = new PublicKey('FBjLBGbW67XnRnuEBdwDHTKvX9KAVK7bdGezPKQyzyK5');

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
    signer,
    false,
    mintAccount.owner,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const createTokenAccountIx = createAssociatedTokenAccountInstruction(
    signer,
    destTokenAccount,
    destination.publicKey,
    mint,
    mintAccount.owner
  );

  createTokenAccountIx.keys.find((key) => key.pubkey.equals(mint))!.isWritable =
    true;

  const tx = new VersionedTransaction(
    new TransactionMessage({
      instructions: [
        SystemProgram.transfer({
          fromPubkey: signer,
          toPubkey: signer,
          lamports: 10,
        }),
        createTokenAccountIx,
        createTransferCheckedInstruction(
          sourceTokenAccount,
          mint,
          destTokenAccount,
          signer,
          5,
          0,
          undefined,
          mintAccount.owner
        ),
      ],
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      payerKey: signer,
    }).compileToV0Message()
  );

  const injectionResults = await buildLighthouseAssertion(
    {
      [ProgramOwner.SYSTEM_PROGRAM]: () => ({ strategy: 'strict' }),
      [ProgramOwner.SPL_TOKEN_2022_PROGRAM]: () => ({ strategy: 'strict' }),
    },
    LogLevel.PlaintextMessage,
    connection,
    tx
  );

  const simulatedInjectionResult = await connection.simulateTransaction(
    injectionResults.injectedTx
  );

  if (simulatedInjectionResult.value.err) {
    throw new Error('Simulated injecteded tx failed');
  }

  // console.log(inspect(injectionResults, false, null, true));
  console.log(simulatedInjectionResult);
};

// Tests transfering tokens between two token2020 accounts (tolerence strategy)
export const tokenAccountToken2022MintToleranceTest = async (
  connection: Connection
) => {
  // Token2022 Mint
  const signer = new PublicKey('w1kASebk8VWsLzAxnnsn9mWAt4CePA3dt9B6sUUjAEv');
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
    signer,
    false,
    mintAccount.owner,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const createTokenAccountIx = createAssociatedTokenAccountInstruction(
    signer,
    destTokenAccount,
    destination.publicKey,
    mint,
    mintAccount.owner
  );

  createTokenAccountIx.keys.find((key) => key.pubkey.equals(mint))!.isWritable =
    true;

  const tx = new VersionedTransaction(
    new TransactionMessage({
      instructions: [
        SystemProgram.transfer({
          fromPubkey: signer,
          toPubkey: signer,
          lamports: 10,
        }),
        createTokenAccountIx,
        createTransferCheckedInstruction(
          sourceTokenAccount,
          mint,
          destTokenAccount,
          signer,
          5,
          0,
          undefined,
          mintAccount.owner
        ),
      ],
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      payerKey: signer,
    }).compileToV0Message()
  );

  const injectionResults = await buildLighthouseAssertion(
    {
      [ProgramOwner.SYSTEM_PROGRAM]: () => ({ strategy: 'strict' }),
      [ProgramOwner.SPL_TOKEN_2022_PROGRAM]: (account) => {
        if (account.accountType === 'account') {
          return {
            strategy: 'tolerance',
            tolerancePercent: 20,
            inclusive: true,
          };
        } else {
          return {
            strategy: 'strict',
          };
        }
      },
    },
    LogLevel.PlaintextMessage,
    connection,
    tx
  );

  const simulatedInjectionResult = await connection.simulateTransaction(
    injectionResults.injectedTx
  );

  if (simulatedInjectionResult.value.err) {
    throw new Error('Simulated injecteded tx failed');
  }

  // console.log(inspect(injectionResults, false, null, true));
  console.log(simulatedInjectionResult);
};

export const tokenAccountTokenLegacyMintToleranceTest = async (
  connection: Connection
) => {
  // Token2022 Mint
  const signer = new PublicKey('w1kASebk8VWsLzAxnnsn9mWAt4CePA3dt9B6sUUjAEv');
  const mint = new PublicKey('AemyCg9jpbWyWzaWnYZhtbisr4HdtfBFJHf9bCSbBnNc');

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
    signer,
    false,
    mintAccount.owner,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const createTokenAccountIx = createAssociatedTokenAccountInstruction(
    signer,
    destTokenAccount,
    destination.publicKey,
    mint,
    mintAccount.owner
  );

  createTokenAccountIx.keys.find((key) => key.pubkey.equals(mint))!.isWritable =
    true;

  const tx = new VersionedTransaction(
    new TransactionMessage({
      instructions: [
        SystemProgram.transfer({
          fromPubkey: signer,
          toPubkey: signer,
          lamports: 10,
        }),
        createTokenAccountIx,
        createTransferCheckedInstruction(
          sourceTokenAccount,
          mint,
          destTokenAccount,
          signer,
          5,
          0,
          undefined,
          mintAccount.owner
        ),
      ],
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      payerKey: signer,
    }).compileToV0Message()
  );

  const injectionResults = await buildLighthouseAssertion(
    {
      [ProgramOwner.SYSTEM_PROGRAM]: () => ({ strategy: 'strict' }),
      [ProgramOwner.SPL_TOKEN_PROGRAM]: (account) => {
        if (account.accountType === 'account') {
          return {
            strategy: 'tolerance',
            tolerancePercent: 20,
            inclusive: true,
          };
        } else {
          return {
            strategy: 'strict',
          };
        }
      },
    },
    LogLevel.PlaintextMessage,
    connection,
    tx
  );

  const simulatedInjectionResult = await connection.simulateTransaction(
    injectionResults.injectedTx
  );

  if (simulatedInjectionResult.value.err) {
    throw new Error('Simulated injecteded tx failed');
  }

  console.log('Overhead (bytes): ', injectionResults.overhead);
  console.log(simulatedInjectionResult);
};
