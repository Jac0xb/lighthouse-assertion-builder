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
  gpaBuilder,
  publicKey as toPublicKey,
} from '@metaplex-foundation/umi';
import { Serializer, struct } from '@metaplex-foundation/umi/serializers';
import {
  Meta,
  MetaArgs,
  Stake,
  StakeArgs,
  getMetaSerializer,
  getStakeSerializer,
} from './types';

export type StakeAccount = Account<StakeAccountAccountData>;

export type StakeAccountAccountData = { meta: Meta; stake: Stake };

export type StakeAccountAccountDataArgs = { meta: MetaArgs; stake: StakeArgs };

export function getStakeAccountAccountDataSerializer(): Serializer<
  StakeAccountAccountDataArgs,
  StakeAccountAccountData
> {
  return struct<StakeAccountAccountData>(
    [
      ['meta', getMetaSerializer()],
      ['stake', getStakeSerializer()],
    ],
    { description: 'StakeAccountAccountData' }
  ) as Serializer<StakeAccountAccountDataArgs, StakeAccountAccountData>;
}

export function deserializeStakeAccount(rawAccount: RpcAccount): StakeAccount {
  return deserializeAccount(rawAccount, getStakeAccountAccountDataSerializer());
}

export async function fetchStakeAccount(
  context: Pick<Context, 'rpc'>,
  publicKey: PublicKey | Pda,
  options?: RpcGetAccountOptions
): Promise<StakeAccount> {
  const maybeAccount = await context.rpc.getAccount(
    toPublicKey(publicKey, false),
    options
  );
  assertAccountExists(maybeAccount, 'StakeAccount');
  return deserializeStakeAccount(maybeAccount);
}

export async function safeFetchStakeAccount(
  context: Pick<Context, 'rpc'>,
  publicKey: PublicKey | Pda,
  options?: RpcGetAccountOptions
): Promise<StakeAccount | null> {
  const maybeAccount = await context.rpc.getAccount(
    toPublicKey(publicKey, false),
    options
  );
  return maybeAccount.exists ? deserializeStakeAccount(maybeAccount) : null;
}

export async function fetchAllStakeAccount(
  context: Pick<Context, 'rpc'>,
  publicKeys: Array<PublicKey | Pda>,
  options?: RpcGetAccountsOptions
): Promise<StakeAccount[]> {
  const maybeAccounts = await context.rpc.getAccounts(
    publicKeys.map((key) => toPublicKey(key, false)),
    options
  );
  return maybeAccounts.map((maybeAccount) => {
    assertAccountExists(maybeAccount, 'StakeAccount');
    return deserializeStakeAccount(maybeAccount);
  });
}

export async function safeFetchAllStakeAccount(
  context: Pick<Context, 'rpc'>,
  publicKeys: Array<PublicKey | Pda>,
  options?: RpcGetAccountsOptions
): Promise<StakeAccount[]> {
  const maybeAccounts = await context.rpc.getAccounts(
    publicKeys.map((key) => toPublicKey(key, false)),
    options
  );
  return maybeAccounts
    .filter((maybeAccount) => maybeAccount.exists)
    .map((maybeAccount) => deserializeStakeAccount(maybeAccount as RpcAccount));
}

export function getStakeAccountGpaBuilder(
  context: Pick<Context, 'rpc' | 'programs'>
) {
  const programId = context.programs.getPublicKey(
    'stake',
    'Stake11111111111111111111111111111111111111'
  );
  return gpaBuilder(context, programId)
    .registerFields<{ meta: MetaArgs; stake: StakeArgs }>({
      meta: [0, getMetaSerializer()],
      stake: [120, getStakeSerializer()],
    })
    .deserializeUsing<StakeAccount>((account) =>
      deserializeStakeAccount(account)
    );
}

export function getStakeAccountSize(): number {
  return 192;
}
