import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { LogLevel } from 'lighthouse-sdk-legacy';
import { deserializeUpgradeableLoaderState } from '../utils/serializer/upgradeableProgramAccount';
import { setUpgradeAuthorityInstruction } from '../utils/serializer/upgradeableProgramAccount/instructions';
import { buildLighthouseAssertion } from '../assertionBuilder';

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

  const injectedTx = await buildLighthouseAssertion(
    {},
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
