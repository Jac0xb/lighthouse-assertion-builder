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
import {
  dataEnum,
  struct,
  Serializer,
  unit,
} from '@metaplex-foundation/umi/serializers';
import { ProgramAccountData } from './utils/serializer/upgradeableProgramAccount/program';
import { deserializeUpgradeableLoaderState } from './utils/serializer/upgradeableProgramAccount';
import { ProgramDataAccountData } from './utils/serializer/upgradeableProgramAccount/programData';
import { BufferAccountData } from './utils/serializer/upgradeableProgramAccount/buffer';
import { UninitializedAccountData } from './utils/serializer/upgradeableProgramAccount/uninitialized';
import { InitializedAccountData } from './utils/serializer/stakeProgramAccount/initialized';
import { StakeAccountAccountData } from './utils/serializer/stakeProgramAccount/stakeAccount';
import { RewardsPoolAccountData } from './utils/serializer/stakeProgramAccount/rewardsPool';
import { deserializeStakeState } from './utils/serializer/stakeProgramAccount';

export enum ProgramOwner {
  SYSTEM_PROGRAM = 'SystemProgram',
  SPL_TOKEN_PROGRAM = 'TokenProgram',
  SPL_TOKEN_2022_PROGRAM = 'Token2020Program',
  SPL_STAKE_PROGRAM = 'StakeProgram',
  UPGRADEABLE_LOADER_PROGRAM = 'UpgradeableLoaderProgram',
  UNKNOWN = 'UnknownProgram',
}

export type ResolvedAccount =
  | ResolvedUnownedAccount
  | ResolvedUnknownAccount
  | ResolvedSystemProgramAccount
  | ResolvedSplTokenProgramAccount
  | ResolvedStakeProgramAccount
  | ResolvedUpgradeableLoaderAccount;

export type ResolvedUnownedAccount = {
  address: PublicKey;
  programOwner: ProgramOwner.SYSTEM_PROGRAM;
  accountInfo: null;
};

export type ResolvedSystemProgramAccount = {
  address: PublicKey;
  programOwner: ProgramOwner.SYSTEM_PROGRAM;
  accountInfo: AccountInfo<Buffer>;
};

export type ResolvedUnknownAccount = {
  address: PublicKey;
  programOwner: ProgramOwner.UNKNOWN;
  accountInfo: AccountInfo<Buffer>;
};

export type ResolvedSplTokenProgramAccount =
  | ResolvedSplTokenProgramTokenAccount
  | ResolvedSplTokenProgramMintAccount
  | ResolvedSplTokenProgramMultisigAccount;

export type ResolvedSplTokenProgramTokenAccount = {
  address: PublicKey;
  programOwner:
    | ProgramOwner.SPL_TOKEN_PROGRAM
    | ProgramOwner.SPL_TOKEN_2022_PROGRAM;
  accountType: 'account';
  state: Account;
  accountInfo: AccountInfo<Buffer>;
};

export type ResolvedSplTokenProgramMintAccount = {
  address: PublicKey;
  programOwner:
    | ProgramOwner.SPL_TOKEN_PROGRAM
    | ProgramOwner.SPL_TOKEN_2022_PROGRAM;
  accountType: 'mint';
  state: Mint;
  accountInfo: AccountInfo<Buffer>;
};

export type ResolvedSplTokenProgramMultisigAccount = {
  address: PublicKey;
  programOwner:
    | ProgramOwner.SPL_TOKEN_PROGRAM
    | ProgramOwner.SPL_TOKEN_2022_PROGRAM;
  accountType: 'multisig';
  accountInfo: AccountInfo<Buffer>;
};

export type ResolvedStakeProgramAccount =
  | ResolvedStakeProgramUninitializedAccount
  | ResolvedStakeProgramInitializedAccount
  | ResolvedStakeProgramStakeAccount
  | ResolvedStakeProgramRewardsPoolAccount;

export type ResolvedStakeProgramUninitializedAccount = {
  address: PublicKey;
  programOwner: ProgramOwner.SPL_STAKE_PROGRAM;
  accountInfo: AccountInfo<Buffer>;
  state: UninitializedAccountData;
  accountType: 'uninitialized';
};

export type ResolvedStakeProgramInitializedAccount = {
  address: PublicKey;
  programOwner: ProgramOwner.SPL_STAKE_PROGRAM;
  accountInfo: AccountInfo<Buffer>;
  state: InitializedAccountData;
  accountType: 'initialized';
};

export type ResolvedStakeProgramStakeAccount = {
  address: PublicKey;
  programOwner: ProgramOwner.SPL_STAKE_PROGRAM;
  accountInfo: AccountInfo<Buffer>;
  state: StakeAccountAccountData;
  accountType: 'stake';
};

export type ResolvedStakeProgramRewardsPoolAccount = {
  address: PublicKey;
  programOwner: ProgramOwner.SPL_STAKE_PROGRAM;
  accountInfo: AccountInfo<Buffer>;
  state: RewardsPoolAccountData;
  accountType: 'rewardsPool';
};

export type ResolvedUpgradeableLoaderAccount =
  | ResolvedUpgradeableLoaderProgramAccount
  | ResolvedUpgradeableLoaderProgramDataAccount
  | ReolvedUpgradeableLoaderProgramBufferAccountData;

export type ResolvedUpgradeableLoaderProgramAccount = {
  address: PublicKey;
  programOwner: ProgramOwner.UPGRADEABLE_LOADER_PROGRAM;
  state: ProgramAccountData;
  accountType: 'program';
  accountInfo: AccountInfo<Buffer>;
};

export type ResolvedUpgradeableLoaderProgramDataAccount = {
  address: PublicKey;
  programOwner: ProgramOwner.UPGRADEABLE_LOADER_PROGRAM;
  state: ProgramDataAccountData;
  accountType: 'programData';
  accountInfo: AccountInfo<Buffer>;
};

export type ReolvedUpgradeableLoaderProgramBufferAccountData = {
  address: PublicKey;
  programOwner: ProgramOwner.UPGRADEABLE_LOADER_PROGRAM;
  state: BufferAccountData;
  accountType: 'buffer';
  accountInfo: AccountInfo<Buffer>;
};

export function resolveAccount(
  address: PublicKey,
  accountInfo: AccountInfo<Buffer> | null
): ResolvedAccount {
  if (!accountInfo) {
    return { address, programOwner: ProgramOwner.SYSTEM_PROGRAM, accountInfo };
  }

  switch (accountInfo.owner.toBase58()) {
    case SystemProgram.programId.toBase58():
      return resolveSystemProgramAccount(address, accountInfo);
    case TOKEN_PROGRAM_ID.toBase58():
      return resolveSplTokenAccount(address, accountInfo);
    case TOKEN_2022_PROGRAM_ID.toBase58():
      return resolveSplToken2022Account(address, accountInfo);
    case 'BPFLoaderUpgradeab1e11111111111111111111111':
      return resolveUpgradeableLoaderAccount(address, accountInfo);
    case 'Stake11111111111111111111111111111111111111':
      return resolveStakeProgramAccount(address, accountInfo);
    default:
      return { address, programOwner: ProgramOwner.UNKNOWN, accountInfo };
  }
}

export function resolveSystemProgramAccount(
  address: PublicKey,
  accountInfo: AccountInfo<Buffer>
): ResolvedSystemProgramAccount {
  return { address, programOwner: ProgramOwner.SYSTEM_PROGRAM, accountInfo };
}

export function resolveStakeProgramAccount(
  address: PublicKey,
  accountInfo: AccountInfo<Buffer>
): ResolvedStakeProgramAccount {
  const state = deserializeStakeState(accountInfo.data);

  switch (state.__kind) {
    case 'Uninitialized':
      return {
        address,
        programOwner: ProgramOwner.SPL_STAKE_PROGRAM,
        accountType: 'uninitialized',
        state,
        accountInfo,
      };
    case 'Initialized':
      return {
        address,
        programOwner: ProgramOwner.SPL_STAKE_PROGRAM,
        accountType: 'initialized',
        state,
        accountInfo,
      };
    case 'Stake':
      return {
        address,
        programOwner: ProgramOwner.SPL_STAKE_PROGRAM,
        accountType: 'stake',
        state,
        accountInfo,
      };
    case 'RewardsPool':
      return {
        address,
        programOwner: ProgramOwner.SPL_STAKE_PROGRAM,
        accountType: 'rewardsPool',
        state,
        accountInfo,
      };
  }
}

export function resolveSplTokenAccount(
  address: PublicKey,
  accountInfo: AccountInfo<Buffer>
): ResolvedAccount {
  if (accountInfo.data.length == MINT_SIZE) {
    const resolvedTokenMint: ResolvedSplTokenProgramMintAccount = {
      address,
      programOwner: ProgramOwner.SPL_TOKEN_PROGRAM,
      accountType: 'mint',
      state: unpackMint(address, accountInfo, TOKEN_PROGRAM_ID),
      accountInfo,
    };

    return resolvedTokenMint;
  } else if (accountInfo.data.length == ACCOUNT_SIZE) {
    const resolvedTokenAccount: ResolvedSplTokenProgramTokenAccount = {
      address,
      programOwner: ProgramOwner.SPL_TOKEN_PROGRAM,
      accountType: 'account',
      state: unpackAccount(address, accountInfo, TOKEN_PROGRAM_ID),
      accountInfo,
    };

    return resolvedTokenAccount;
  } else if (accountInfo.data.length == MULTISIG_SIZE) {
    console.log(unpackMultisig(address, accountInfo, TOKEN_PROGRAM_ID));
    throw new Error('Unimplemented');
  } else {
    throw new Error('Invalid account size');
  }
}

export function resolveSplToken2022Account(
  address: PublicKey,
  accountInfo: AccountInfo<Buffer>
): ResolvedAccount {
  if (accountInfo.data.length < ACCOUNT_SIZE) {
    throw new Error('Unimplemented');
  } else {
    if (accountInfo.data[ACCOUNT_SIZE] == AccountType.Mint) {
      // console.log(unpackMint(address, account, TOKEN_2022_PROGRAM_ID));

      const resolvedTokenMint: ResolvedSplTokenProgramMintAccount = {
        address,
        programOwner: ProgramOwner.SPL_TOKEN_2022_PROGRAM,
        accountType: 'mint',
        state: unpackMint(address, accountInfo, TOKEN_2022_PROGRAM_ID),
        accountInfo,
      };

      return resolvedTokenMint;
    } else if (accountInfo.data[ACCOUNT_SIZE] == AccountType.Account) {
      const resolvedTokenAccount: ResolvedSplTokenProgramTokenAccount = {
        address,
        programOwner: ProgramOwner.SPL_TOKEN_2022_PROGRAM,
        accountType: 'account',
        state: unpackAccount(address, accountInfo, TOKEN_2022_PROGRAM_ID),
        accountInfo,
      };

      return resolvedTokenAccount;
    } else {
      throw new Error('Invalid account type');
    }
  }
}

export function resolveUpgradeableLoaderAccount(
  address: PublicKey,
  accountInfo: AccountInfo<Buffer>
): ResolvedUpgradeableLoaderAccount {
  const state = deserializeUpgradeableLoaderState(accountInfo.data);

  switch (state.__kind) {
    case 'Buffer':
      return {
        address,
        programOwner: ProgramOwner.UPGRADEABLE_LOADER_PROGRAM,
        state,
        accountType: 'buffer',
        accountInfo,
      };
    case 'Program':
      throw new Error('Unimplemented');
    case 'ProgramData':
      return {
        address,
        programOwner: ProgramOwner.UPGRADEABLE_LOADER_PROGRAM,
        state,
        accountType: 'programData',
        accountInfo,
      };
    case 'Uninitialized':
      throw new Error('Unimplemented');
  }
}
