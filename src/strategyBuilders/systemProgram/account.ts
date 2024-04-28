import { PublicKey } from '@solana/web3.js';
import {
  EquatableOperator,
  IntegerOperator,
  assertAccountInfo,
  accountInfoAssertion,
  KnownProgram,
  AccountInfoAssertion,
  assertAccountInfoMulti,
} from 'lighthouse-sdk-legacy';
import { publicKey } from '@metaplex-foundation/umi';

import { createLighthouseProgram, LogLevel } from 'lighthouse-sdk-legacy';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  ProgramOwner,
  ResolvedAccount,
  ResolvedSystemProgramAccount,
} from '../../resolvedAccount';
import { calculateToleranceRange, toWeb3JSInstruction } from '../utils';

export const umi = createUmi('https://api.devnet.solana.com');
umi.programs.add(createLighthouseProgram());

export const SystemProgramAccountStrategies = {
  buildStrictAssertion: function (
    simulatedAccount: ResolvedSystemProgramAccount,
    logLevel: LogLevel
  ) {
    const assertions = [
      accountInfoAssertion('Lamports', {
        operator: IntegerOperator.Equal,
        value: simulatedAccount.accountInfo.lamports,
      }),
      accountInfoAssertion('KnownOwner', {
        value: KnownProgram.System,
        operator: EquatableOperator.Equal,
      }),
    ];

    let builder = assertAccountInfoMulti(umi, {
      targetAccount: publicKey(simulatedAccount.address),
      logLevel,
      assertions,
    });

    return toWeb3JSInstruction(builder.getInstructions());
  },
  buildToleranceAssertion: function (
    simulatedAccount: ResolvedSystemProgramAccount,
    logLevel: LogLevel,
    args: { tolerancePercentage: number }
  ) {
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

    let builder = assertAccountInfoMulti(umi, {
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
