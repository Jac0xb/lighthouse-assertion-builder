/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import {
  Account,
  Context,
  Pda,
  PublicKey,
  RpcAccount,
  RpcGetAccountOptions,
  RpcGetAccountsOptions,
  assertAccountExists,
  deserializeAccount,
  publicKey as toPublicKey,
} from '@metaplex-foundation/umi';
import { Serializer, struct } from '@metaplex-foundation/umi/serializers';

export type RewardsPool = Account<RewardsPoolAccountData>;

export type RewardsPoolAccountData = {};

export type RewardsPoolAccountDataArgs = RewardsPoolAccountData;

export function getRewardsPoolAccountDataSerializer(): Serializer<
  RewardsPoolAccountDataArgs,
  RewardsPoolAccountData
> {
  return struct<RewardsPoolAccountData>([], {
    description: 'RewardsPoolAccountData',
  }) as Serializer<RewardsPoolAccountDataArgs, RewardsPoolAccountData>;
}

export function deserializeRewardsPool(rawAccount: RpcAccount): RewardsPool {
  return deserializeAccount(rawAccount, getRewardsPoolAccountDataSerializer());
}

export async function fetchRewardsPool(
  context: Pick<Context, 'rpc'>,
  publicKey: PublicKey | Pda,
  options?: RpcGetAccountOptions
): Promise<RewardsPool> {
  const maybeAccount = await context.rpc.getAccount(
    toPublicKey(publicKey, false),
    options
  );
  assertAccountExists(maybeAccount, 'RewardsPool');
  return deserializeRewardsPool(maybeAccount);
}

export async function safeFetchRewardsPool(
  context: Pick<Context, 'rpc'>,
  publicKey: PublicKey | Pda,
  options?: RpcGetAccountOptions
): Promise<RewardsPool | null> {
  const maybeAccount = await context.rpc.getAccount(
    toPublicKey(publicKey, false),
    options
  );
  return maybeAccount.exists ? deserializeRewardsPool(maybeAccount) : null;
}

export async function fetchAllRewardsPool(
  context: Pick<Context, 'rpc'>,
  publicKeys: Array<PublicKey | Pda>,
  options?: RpcGetAccountsOptions
): Promise<RewardsPool[]> {
  const maybeAccounts = await context.rpc.getAccounts(
    publicKeys.map((key) => toPublicKey(key, false)),
    options
  );
  return maybeAccounts.map((maybeAccount) => {
    assertAccountExists(maybeAccount, 'RewardsPool');
    return deserializeRewardsPool(maybeAccount);
  });
}

export async function safeFetchAllRewardsPool(
  context: Pick<Context, 'rpc'>,
  publicKeys: Array<PublicKey | Pda>,
  options?: RpcGetAccountsOptions
): Promise<RewardsPool[]> {
  const maybeAccounts = await context.rpc.getAccounts(
    publicKeys.map((key) => toPublicKey(key, false)),
    options
  );
  return maybeAccounts
    .filter((maybeAccount) => maybeAccount.exists)
    .map((maybeAccount) => deserializeRewardsPool(maybeAccount as RpcAccount));
}

export function getRewardsPoolSize(): number {
  return 0;
}
