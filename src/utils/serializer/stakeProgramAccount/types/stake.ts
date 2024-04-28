/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import { Serializer, struct, u64 } from '@metaplex-foundation/umi/serializers';
import { Delegation, DelegationArgs, getDelegationSerializer } from '.';

export type Stake = { delegation: Delegation; creditsObserved: bigint };

export type StakeArgs = {
  delegation: DelegationArgs;
  creditsObserved: number | bigint;
};

export function getStakeSerializer(): Serializer<StakeArgs, Stake> {
  return struct<Stake>(
    [
      ['delegation', getDelegationSerializer()],
      ['creditsObserved', u64()],
    ],
    { description: 'Stake' }
  ) as Serializer<StakeArgs, Stake>;
}
