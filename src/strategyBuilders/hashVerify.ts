import { assertAccountInfo, accountInfoAssertion } from 'lighthouse-sdk-legacy';
import { publicKey } from '@metaplex-foundation/umi';

import { createLighthouseProgram, LogLevel } from 'lighthouse-sdk-legacy';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { ResolvedAccount } from '../resolvedAccount';
import { toWeb3JSInstruction } from './utils';
import { keccak_256 } from 'js-sha3';

export const umi = createUmi('https://api.devnet.solana.com');
umi.programs.add(createLighthouseProgram());

export const HashVerifyStrategy = {
  buildAssertion: function (
    simulatedAccount: ResolvedAccount,
    logLevel: LogLevel,
    start: number | null = null,
    length: number | null = null
  ) {
    if (!simulatedAccount.accountInfo) {
      throw new Error(
        `AccountInfo is missing for account ${simulatedAccount.address}`
      );
    }

    const accountDataHash = Buffer.from(
      keccak_256.digest(
        simulatedAccount.accountInfo.data.subarray(
          start ?? undefined,
          length !== null ? (start ?? 0) + length : undefined
        )
      )
    );

    let builder = assertAccountInfo(umi, {
      targetAccount: publicKey(simulatedAccount.address),
      logLevel,
      assertion: accountInfoAssertion('VerifyDatahash', {
        start,
        length,
        expectedHash: accountDataHash,
      }),
    });

    return toWeb3JSInstruction(builder.getInstructions());
  },
};
