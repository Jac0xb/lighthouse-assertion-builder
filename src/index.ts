import { Connection } from '@solana/web3.js';
import {
  programBufferAuthorityChangeGuardTest,
  programDataAuthorityChangeGuardTest,
} from './tests/upgradeableLoader/authorityChangeGuard';
import { stakeAuthorizeGuardTest } from './tests/staking/authorizeGuard';
import {
  tokenAccountToken2022MintStrictTest,
  tokenAccountToken2022MintToleranceTest,
  tokenAccountTokenLegacyMintToleranceTest,
} from './tests/token/token';
import { unknownAccountHashVerifyStrategyTest } from './tests/unknown/hashverify';

(async () => {
  const connection = new Connection('https://api.devnet.solana.com');
  await stakeAuthorizeGuardTest(connection);
  await programDataAuthorityChangeGuardTest(connection);
  await programBufferAuthorityChangeGuardTest(connection);
  await tokenAccountToken2022MintStrictTest(connection);
  await tokenAccountToken2022MintToleranceTest(connection);
  await tokenAccountTokenLegacyMintToleranceTest(connection);
  await unknownAccountHashVerifyStrategyTest(connection);
})();
