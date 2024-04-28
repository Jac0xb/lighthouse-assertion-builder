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
  ResolvedSplTokenProgramTokenAccount,
} from './resolvedAccount';
import { toWeb3JSInstruction } from './strategyBuilders/utils';

export enum AssertionStrategy {
  Strict = 'strict',
  Tolerance = 'tolerance',
}

export abstract class AccountAssertionBuilder<T extends ResolvedAccount> {
  // protected strategyInstructionBuilders: Map<
  //   string,
  //   <U>(
  //     currentAccount: T,
  //     simulatedAccount: T,
  //     args: U
  //   ) => TransactionInstruction[]
  // >;

  // constructor() {
  //   this.strategyInstructionBuilders = new Map();
  // }

  abstract isAccountType(account: T): account is T;
  abstract isOwner(account: T, owner: PublicKey): boolean;

  //   buildAssertion<U>(
  //     strategy: string,
  //     currentAccount: T,
  //     simulatedAccount: T,
  //     args: U
  //   ) {
  //     const builder = this.strategyInstructionBuilders.get(strategy);

  //     if (!builder) {
  //       throw new Error(`No builder for strategy ${strategy}`);
  //     }

  //     return builder<U>(currentAccount, simulatedAccount, args);
  //   }

  //   addStrategy(
  //     strategy: AssertionStrategy,
  //     builder: <U>(
  //       currentAccount: ResolvedAccount,
  //       simulatedAccount: ResolvedAccount,
  //       args: U
  //     ) => TransactionInstruction[]
  //   ) {
  //     if (this.strategyInstructionBuilders.has(strategy)) {
  //       throw new Error(`Strategy ${strategy} already exists`);
  //     }

  //     this.strategyInstructionBuilders.set(strategy, builder);
  //   }
}
