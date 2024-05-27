import {
  EquatableOperator,
  assertStakeAccountMulti,
  StakeAccountAssertion,
  StakeStateType,
  assertAccountInfo,
  IntegerOperator,
} from 'lighthouse-sdk-legacy';
import { publicKey } from '@metaplex-foundation/umi';
import { LogLevel } from 'lighthouse-sdk-legacy';
import { ResolvedStakeProgramAccount } from '../../resolvedAccount';
import { toWeb3JSInstruction } from '../utils';
import { UMI } from '../../utils/umi';

export const StakeProgramAccountStrategies = {
  buildStrictAssertion: function (
    simulatedAccount: ResolvedStakeProgramAccount,
    logLevel: LogLevel
  ) {
    const assertions: StakeAccountAssertion[] = [];

    let stakeState: StakeStateType;

    switch (simulatedAccount.accountType) {
      case 'uninitialized':
        stakeState = StakeStateType.Uninitialized;
        break;
      case 'initialized':
        stakeState = StakeStateType.Initialized;
        break;
      case 'stake':
        stakeState = StakeStateType.Stake;
        break;
      case 'rewardsPool':
        stakeState = StakeStateType.RewardsPool;
        break;
    }

    assertions.push({
      __kind: 'State',
      value: stakeState,
      operator: EquatableOperator.Equal,
    });

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

    let builder = assertStakeAccountMulti(UMI, {
      targetAccount: publicKey(simulatedAccount.address),
      logLevel,
      assertions,
    });

    return toWeb3JSInstruction([
      ...assertAccountInfo(UMI, {
        targetAccount: publicKey(simulatedAccount.address),
        logLevel,
        assertion: {
          __kind: 'Lamports',
          operator: IntegerOperator.Equal,
          value: BigInt(simulatedAccount.accountInfo.lamports),
        },
      }).getInstructions(),
      ...builder.getInstructions(),
    ]);
  },
};
