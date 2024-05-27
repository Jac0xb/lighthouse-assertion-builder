import { PublicKey } from '@solana/web3.js';
import {
  EquatableOperator,
  IntegerOperator,
  accountInfoAssertion,
  KnownProgram,
  assertAccountInfoMulti,
} from 'lighthouse-sdk-legacy';
import { publicKey } from '@metaplex-foundation/umi';
import { LogLevel } from 'lighthouse-sdk-legacy';
import {
  ProgramOwner,
  ResolvedAccount,
  ResolvedSystemProgramAccount,
  ResolvedUnownedAccount,
} from '../../resolvedAccount';
import { calculateToleranceRange, toWeb3JSInstruction } from '../utils';
import { UMI } from '../../utils/umi';

export const SystemProgramAccountStrategies = {
  buildStrictAssertion: function (
    simulatedAccount: ResolvedUnownedAccount | ResolvedSystemProgramAccount,
    logLevel: LogLevel
  ) {
    const assertions = [
      accountInfoAssertion('Lamports', {
        operator: IntegerOperator.Equal,
        value: simulatedAccount.accountInfo?.lamports ?? 0,
      }),
      accountInfoAssertion('KnownOwner', {
        value: KnownProgram.System,
        operator: EquatableOperator.Equal,
      }),
    ];

    let builder = assertAccountInfoMulti(UMI, {
      targetAccount: publicKey(simulatedAccount.address),
      logLevel,
      assertions,
    });

    return toWeb3JSInstruction(builder.getInstructions());
  },
  buildToleranceAssertion: function (
    simulatedAccount: ResolvedUnownedAccount | ResolvedSystemProgramAccount,
    logLevel: LogLevel,
    args: { tolerancePercentage: number }
  ) {
    if (!simulatedAccount.accountInfo) {
      return SystemProgramAccountStrategies.buildStrictAssertion(
        simulatedAccount,
        logLevel
      );
    }

    const balanceBigint = BigInt(simulatedAccount.accountInfo.lamports);
    const toleranceRange = calculateToleranceRange(
      balanceBigint,
      args.tolerancePercentage
    );

    const assertions = [
      accountInfoAssertion('Lamports', {
        value: balanceBigint - toleranceRange,
        operator: IntegerOperator.GreaterThanOrEqual,
      }),
      accountInfoAssertion('Lamports', {
        value: balanceBigint + toleranceRange,
        operator: IntegerOperator.LessThanOrEqual,
      }),
      accountInfoAssertion('KnownOwner', {
        value: KnownProgram.System,
        operator: EquatableOperator.Equal,
      }),
    ];

    let builder = assertAccountInfoMulti(UMI, {
      targetAccount: publicKey(simulatedAccount.address),
      logLevel,
      assertions,
    });

    return toWeb3JSInstruction(builder.getInstructions());
  },
  isAccountType: function (
    account: ResolvedAccount
  ): account is ResolvedSystemProgramAccount {
    return account.programOwner === ProgramOwner.SYSTEM_PROGRAM;
  },
  isOwner: function (account: ResolvedSystemProgramAccount, owner: PublicKey) {
    return account.address === owner;
  },
  getProgramOwner: function () {
    return ProgramOwner.SYSTEM_PROGRAM;
  },
};
