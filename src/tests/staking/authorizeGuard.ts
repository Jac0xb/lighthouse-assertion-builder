import {
  Connection,
  Keypair,
  PublicKey,
  StakeProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { ProgramOwner } from '../../resolvedAccount';
import { deserializeStakeState } from '../../utils/serializer/stakeProgramAccount';
import { injectLighthouseIntoTransaction } from '../../lighthouseInjection';
import { inspect } from 'util';
import { LogLevel } from 'lighthouse-sdk-legacy';

export const stakeAuthorizeGuardTest = async (connection: Connection) => {
  const signer = new PublicKey('5B6svuwWuW9w8Y2a868Mf6xDvqjCHkmrYByUyggi7ioj');
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
      authorizedPubkey: signer,
      newAuthorizedPubkey: newStaker.publicKey,
      stakeAuthorizationType: {
        index: authorizationType,
      },
    });
    stakeTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    stakeTx.feePayer = signer;

    return TransactionMessage.decompile(
      VersionedTransaction.deserialize(
        stakeTx.serialize({
          verifySignatures: false,
          requireAllSignatures: false,
        })
      ).message
    ).instructions[0];
  };

  const tx = new VersionedTransaction(
    new TransactionMessage({
      instructions: [await createAuthorize(0), await createAuthorize(1)],
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      payerKey: signer,
    }).compileToV0Message()
  );

  const injectionResults = await injectLighthouseIntoTransaction(
    {
      [ProgramOwner.SPL_STAKE_PROGRAM]: () => {
        return {
          strategy: 'strict',
        };
      },
      [ProgramOwner.UNKNOWN]: () => {
        return {
          strategy: 'none',
        };
      },
      [ProgramOwner.SYSTEM_PROGRAM]: () => {
        return {
          strategy: 'tolerance',
          tolerancePercent: 2,
          inclusive: true,
        };
      },
    },
    LogLevel.PlaintextMessage,
    connection,
    tx
  );

  const simulatedInjectionResult = await connection.simulateTransaction(
    injectionResults.injectedTx,
    {
      accounts: {
        encoding: 'base64',
        addresses: [stakeAccount.toString()],
      },
    }
  );

  if (simulatedInjectionResult.value.err) {
    throw new Error('Simulated injecteded tx failed');
  }

  console.log(simulatedInjectionResult);
  console.log(inspect(injectionResults, false, null, true));
};
