/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  StakeProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  InitializedAccountData,
  getInitializedAccountDataSerializer,
} from './initialized';
import {
  RewardsPoolAccountData,
  getRewardsPoolAccountDataSerializer,
} from './rewardsPool';
import {
  StakeAccountAccountData,
  getStakeAccountAccountDataSerializer,
} from './stakeAccount';
import {
  UninitializedAccountData,
  getUninitializedAccountDataSerializer,
} from './uninitialized';

export function deserializeStakeState(
  data: Buffer
):
  | ({ __kind: 'Uninitialized' } & UninitializedAccountData)
  | ({ __kind: 'Initialized' } & InitializedAccountData)
  | ({ __kind: 'Stake' } & StakeAccountAccountData)
  | ({ __kind: 'RewardsPool' } & RewardsPoolAccountData) {
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
        __kind: 'Initialized',
        ...getInitializedAccountDataSerializer().deserialize(
          remainingAccountData
        )[0],
      };
    case 2:
      return {
        __kind: 'Stake',
        ...getStakeAccountAccountDataSerializer().deserialize(
          remainingAccountData
        )[0],
      };
    case 3:
      return {
        __kind: 'RewardsPool',
        ...getRewardsPoolAccountDataSerializer().deserialize(
          remainingAccountData
        )[0],
      };
    default:
      throw new Error(`Unknown tag: ${tag}`);
  }
}

/// Authorize a key to manage stake or withdrawal
///
/// This instruction behaves like `Authorize` with the additional requirement that the new
/// stake or withdraw authority must also be a signer.
///
/// # Account references
///   0. `[WRITE]` Stake account to be updated
///   1. `[]` Clock sysvar
///   2. `[SIGNER]` The stake or withdraw authority
///   3. `[SIGNER]` The new stake or withdraw authority
///   4. Optional: `[SIGNER]` Lockup authority, if updating StakeAuthorize::Withdrawer before
///      lockup expiration
// AuthorizeChecked(StakeAuthorize),

// #[derive(Debug, Serialize, Deserialize, PartialEq, Eq, Clone, Copy, AbiExample)]
// pub enum StakeAuthorize {
//     Staker,
//     Withdrawer,
// }

export enum StakeAuthorize {
  Staker,
  Withdrawer,
}

export function authorizeCheckedInstruction(
  stakeAccount: PublicKey,
  stakeAuthority: PublicKey,
  newStakeAuthority: PublicKey,
  stakeAuthorize: StakeAuthorize
): TransactionInstruction {
  return {
    keys: [
      { pubkey: stakeAccount, isSigner: true, isWritable: true },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: stakeAuthority, isSigner: true, isWritable: false },
      { pubkey: stakeAuthority, isSigner: true, isWritable: false },
    ],
    programId: StakeProgram.programId,
    data: Buffer.from([
      1,
      0,
      0,
      0,
      ...newStakeAuthority.toBuffer(),
      stakeAuthorize,
      0,
      0,
      0,
      0,
    ]),
  };
}
