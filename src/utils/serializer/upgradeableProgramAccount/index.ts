/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import { BufferAccountData, getBufferAccountDataSerializer } from './buffer';
import { ProgramAccountData, getProgramAccountDataSerializer } from './program';
import {
  ProgramDataAccountData,
  getProgramDataAccountDataSerializer,
} from './programData';
import {
  UninitializedAccountData,
  getUninitializedAccountDataSerializer,
} from './uninitialized';

// pub enum UpgradeableLoaderState {
//   /// Account is not initialized.
//   Uninitialized,
//   /// A Buffer account.
//   Buffer {
//       /// Authority address
//       authority_address: Option<Pubkey>,
//       // The raw program data follows this serialized structure in the
//       // account's data.
//   },
//   /// An Program account.
//   Program {
//       /// Address of the ProgramData account.
//       programdata_address: Pubkey,
//   },
//   // A ProgramData account.
//   ProgramData {
//       /// Slot that the program was last modified.
//       slot: u64,
//       /// Address of the Program's upgrade authority.
//       upgrade_authority_address: Option<Pubkey>,
//       // The raw program data follows this serialized structure in the
//       // account's data.
//   },
// }

export function deserializeUpgradeableLoaderState(
  data: Buffer
):
  | ({ __kind: 'Buffer' } & BufferAccountData)
  | ({ __kind: 'Program' } & ProgramAccountData)
  | ({ __kind: 'ProgramData' } & ProgramDataAccountData)
  | ({ __kind: 'Uninitialized' } & UninitializedAccountData) {
  const [tag] = new Uint8Array(data);

  const remainingAccountData = new Uint8Array([...data.subarray(4)]);

  switch (tag) {
    case 0:
      return {
        __kind: 'Uninitialized',
        ...getUninitializedAccountDataSerializer().deserialize(
          remainingAccountData
        )[0],
      };
    case 1:
      return {
        __kind: 'Buffer',
        ...getBufferAccountDataSerializer().deserialize(
          remainingAccountData.subarray(0, 32 + 1)
        )[0],
      };
    case 2:
      return {
        __kind: 'Program',
        ...getProgramAccountDataSerializer().deserialize(
          remainingAccountData
        )[0],
      };
    case 3:
      return {
        __kind: 'ProgramData',
        ...getProgramDataAccountDataSerializer().deserialize(
          remainingAccountData
        )[0],
      };
    default:
      throw new Error(`Unknown tag: ${tag}`);
  }
}
