import fs from 'fs';
import {
  Connection,
  Keypair,
  PublicKey,
  StakeProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { LogLevel } from 'lighthouse-sdk-legacy';

import {
  ProgramOwner,
  ResolvedSplTokenProgramAccount,
  ResolvedStakeProgramAccount,
  ResolvedSystemProgramAccount,
  ResolvedUnknownAccount,
  ResolvedUnownedAccount,
  ResolvedUpgradeableLoaderAccount,
} from './resolvedAccount';
import { deserializeStakeState } from './utils/serializer/stakeProgramAccount';
import {
  AssertionBuilderConfig,
  injectLighthouseIntoTransaction,
} from './lighthouseInjection';
import { deserializeInstruction } from './tests/utils';
import { inspect } from 'util';
import { deepEqual } from 'assert';
import { stakeAuthorizeGuardTest } from './tests/staking/authorizeGuard';
import { programBufferAuthorityChangeGuardTest } from './tests/upgradeableLoader/authorityChangeGuard';

const STRATEGY_CONFIG: AssertionBuilderConfig = {
  [ProgramOwner.SPL_TOKEN_PROGRAM]: (
    resolvedAccount: ResolvedSplTokenProgramAccount | ResolvedUnownedAccount
  ) => {
    return {
      strategy: 'strict',
    };
  },
  [ProgramOwner.SPL_TOKEN_2022_PROGRAM]: (
    resolvedAccount: ResolvedSplTokenProgramAccount
  ) => {
    return {
      strategy: 'strict',
    };
  },
  [ProgramOwner.SYSTEM_PROGRAM]: (
    resolvedAccount: ResolvedSystemProgramAccount | ResolvedUnownedAccount
  ) => {
    if (resolvedAccount.accountInfo?.data.length ?? 0 > 0) {
      return {
        strategy: 'hashverify',
      };
    }

    return {
      strategy: 'tolerance',
      tolerancePercent: 2,
      inclusive: true,
    };
  },
  [ProgramOwner.SPL_STAKE_PROGRAM]: (
    resolvedAccount: ResolvedStakeProgramAccount
  ) => {
    return {
      strategy: 'strict',
    };
  },
  [ProgramOwner.UPGRADEABLE_LOADER_PROGRAM]: (
    resolvedAccount: ResolvedUpgradeableLoaderAccount
  ) => {
    return {
      strategy: 'strict',
    };
  },
  [ProgramOwner.UNKNOWN]: (resolvedAccount: ResolvedUnknownAccount) => {
    return {
      strategy: 'none',
    };
  },
};

const LOG_LEVEL_CONFIG = LogLevel.PlaintextMessage;

(async () => {
  const connection = new Connection('https://api.devnet.solana.com');
  // await stakeAuthorizeGuardTest(connection);
  // await authorityChangeGuardTest(connection);
  await programBufferAuthorityChangeGuardTest(connection);
})();
