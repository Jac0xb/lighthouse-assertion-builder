/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import {
  Serializer,
  scalarEnum,
  u32,
} from '@metaplex-foundation/umi/serializers';

export enum StakeAuthorize {
  Staker,
  Withdrawer,
}

export type StakeAuthorizeArgs = StakeAuthorize;

export function getStakeAuthorizeSerializer(): Serializer<
  StakeAuthorizeArgs,
  StakeAuthorize
> {
  return scalarEnum<StakeAuthorize>(StakeAuthorize, {
    size: u32(),
    description: 'StakeAuthorize',
  }) as Serializer<StakeAuthorizeArgs, StakeAuthorize>;
}
