import {
  EquatableOperator,
  assertStakeAccountMulti,
  StakeAccountAssertion,
} from 'lighthouse-sdk-legacy';
import { publicKey } from '@metaplex-foundation/umi';
import { createLighthouseProgram, LogLevel } from 'lighthouse-sdk-legacy';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { ResolvedStakeProgramAccount } from '../../resolvedAccount';
import { toWeb3JSInstruction } from '../utils';

export const umi = createUmi('https://api.devnet.solana.com');
umi.programs.add(createLighthouseProgram());

export const StakeProgramAccountStrategies = {
  buildStrictAssertion: function (
    simulatedAccount: ResolvedStakeProgramAccount,
    logLevel: LogLevel
  ) {
    const assertions: StakeAccountAssertion[] = [];

    if (
      simulatedAccount.accountType === 'initialized' ||
      simulatedAccount.accountType === 'stake'
    ) {
      assertions.push({
        __kind: 'MetaAssertion',
        fields: [
          {
            __kind: 'AuthorizedWithdrawer',
            value: publicKey(simulatedAccount.state.meta.authorized.withdrawer),
            operator: EquatableOperator.Equal,
          },
        ],
      });

      assertions.push({
        __kind: 'MetaAssertion',
        fields: [
          {
            __kind: 'AuthorizedStaker',
            value: publicKey(simulatedAccount.state.meta.authorized.staker),
            operator: EquatableOperator.Equal,
          },
        ],
      });
    }

    let builder = assertStakeAccountMulti(umi, {
      targetAccount: publicKey(simulatedAccount.address),
      logLevel,
      assertions,
    });

    return toWeb3JSInstruction(builder.getInstructions());
  },
};
