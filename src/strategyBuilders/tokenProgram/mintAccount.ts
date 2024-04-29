import { generateKeyPairSync } from 'crypto';
import {
  createInitializeMintInstruction,
  createInitializeMintCloseAuthorityInstruction,
  getMintLen,
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createMintToCheckedInstruction,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
  revoke,
  createRevokeInstruction,
  createBurnInstruction,
  createCloseAccountInstruction,
  createMint,
  TOKEN_PROGRAM_ID,
  getAccount,
  unpackAccount,
  ACCOUNT_SIZE,
  AccountType,
  unpackMint,
  createMintToInstruction,
  MINT_SIZE,
  MULTISIG_SIZE,
  unpackMultisig,
  Account,
  Mint,
} from '@solana/spl-token';
import fs from 'fs';
import {
  AccountInfo,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  assertTokenAccount,
  tokenAccountAssertion,
  EquatableOperator,
  IntegerOperator,
  assertMintAccount,
  mintAccountAssertion,
  assertMintAccountMulti,
} from 'lighthouse-sdk-legacy';
import { publicKey } from '@metaplex-foundation/umi';
import {
  toWeb3JsLegacyTransaction,
  toWeb3JsPublicKey,
} from '@metaplex-foundation/umi-web3js-adapters';

import { createLighthouseProgram, LogLevel } from 'lighthouse-sdk-legacy';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  ProgramOwner,
  ResolvedAccount,
  ResolvedSplTokenProgramMintAccount,
  ResolvedSplTokenProgramTokenAccount,
} from '../../resolvedAccount';
import { toWeb3JSInstruction } from '../utils';

function isAccountType(
  account: ResolvedAccount
): account is ResolvedSplTokenProgramMintAccount {
  return (
    account.programOwner === ProgramOwner.SPL_TOKEN_PROGRAM &&
    account.accountType === 'mint'
  );
}

function isOwner(
  account: ResolvedSplTokenProgramMintAccount,
  owner: PublicKey
) {
  return (
    ((account.state.freezeAuthority &&
      account.state.freezeAuthority.equals(owner)) ||
      (account.state.mintAuthority &&
        account.state.mintAuthority.equals(owner))) ??
    false
  );
}

function getProgramOwner() {
  return ProgramOwner.SPL_TOKEN_PROGRAM;
}

export const umi = createUmi('https://api.devnet.solana.com');
umi.programs.add(createLighthouseProgram());

function buildStrictAssertion(
  simulatedAccount: ResolvedSplTokenProgramMintAccount,
  logLevel: LogLevel
) {
  const assertions = [
    mintAccountAssertion('Supply', {
      value: simulatedAccount.state.supply,
      operator: IntegerOperator.Equal,
    }),
    mintAccountAssertion('FreezeAuthority', {
      value: simulatedAccount.state.freezeAuthority
        ? publicKey(simulatedAccount.state.freezeAuthority)
        : null,
      operator: EquatableOperator.Equal,
    }),
    mintAccountAssertion('MintAuthority', {
      value: simulatedAccount.state.mintAuthority
        ? publicKey(simulatedAccount.state.mintAuthority)
        : null,
      operator: EquatableOperator.Equal,
    }),
  ];

  let builder = assertMintAccountMulti(umi, {
    targetAccount: publicKey(simulatedAccount.address),
    logLevel,
    assertions,
  });

  return toWeb3JSInstruction(builder.getInstructions());
}

export const MintAccountStrategies = {
  buildStrictAssertion,
  getProgramOwner,
  isAccountType,
  isOwner,
};
