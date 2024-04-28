import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import {
  assertTokenAccount,
  tokenAccountAssertion,
  EquatableOperator,
  IntegerOperator,
  assertTokenAccountMulti,
} from 'lighthouse-sdk-legacy';
import { publicKey } from '@metaplex-foundation/umi';

import { createLighthouseProgram, LogLevel } from 'lighthouse-sdk-legacy';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  ProgramOwner,
  ResolvedAccount,
  ResolvedSplTokenProgramTokenAccount,
} from '../../resolvedAccount';
import { calculateToleranceRange, toWeb3JSInstruction } from '../utils';
import { AccountAssertionBuilder } from '../../assertionBuilder';

function isAccountType(
  account: ResolvedAccount
): account is ResolvedSplTokenProgramTokenAccount {
  return (
    account.programOwner === ProgramOwner.SPL_TOKEN_PROGRAM &&
    account.accountType === 'account'
  );
}

function isOwner(
  account: ResolvedSplTokenProgramTokenAccount,
  owner: PublicKey
) {
  return account.state.owner.equals(owner);
}

function getProgramOwner() {
  return ProgramOwner.SPL_TOKEN_PROGRAM;
}
export const AccountRegistry: {
  [key: string]: AccountAssertionBuilder<ResolvedAccount>;
} = {};

export const registerAccount = (
  config: AccountAssertionBuilder<ResolvedAccount>
) => {};

export const umi = createUmi('https://api.devnet.solana.com');
umi.programs.add(createLighthouseProgram());

const buildAssertOwner = (
  simulatedAccount: ResolvedSplTokenProgramTokenAccount,
  logLevel: LogLevel
) => {
  const tokenAccount = getAssociatedTokenAddressSync(
    simulatedAccount.state.mint,
    simulatedAccount.state.owner,
    false,
    TOKEN_PROGRAM_ID
  );

  // If the address of the token account matches the derived address, then we can save space deriving address by owner + mint at runtime
  if (
    simulatedAccount.address.equals(tokenAccount) &&
    simulatedAccount.state.owner.equals(simulatedAccount.state.owner)
  ) {
    return [tokenAccountAssertion('TokenAccountOwnerIsDerived')];
  } else {
    return [
      tokenAccountAssertion('Owner', {
        value: publicKey(simulatedAccount.state.owner),
        operator: EquatableOperator.Equal,
      }),
      tokenAccountAssertion('Mint', {
        value: publicKey(simulatedAccount.state.mint),
        operator: EquatableOperator.Equal,
      }),
    ];
  }
};

function buildStrictAssertion(
  simulatedAccount: ResolvedSplTokenProgramTokenAccount,
  logLevel: LogLevel
) {
  const assertions = [
    ...buildAssertOwner(simulatedAccount, logLevel),
    tokenAccountAssertion('Amount', {
      value: simulatedAccount.state.amount,
      operator: IntegerOperator.Equal,
    }),
    tokenAccountAssertion('Delegate', {
      value: simulatedAccount.state.delegate
        ? publicKey(simulatedAccount.state.delegate)
        : null,
      operator: EquatableOperator.Equal,
    }),
  ];

  let builder = assertTokenAccountMulti(umi, {
    targetAccount: publicKey(simulatedAccount.address),
    logLevel,
    assertions,
  });

  return toWeb3JSInstruction(builder.getInstructions());
}

function buildToleranceAssertion(
  simulatedAccount: ResolvedSplTokenProgramTokenAccount,
  logLevel: LogLevel,
  args: { tolerancePercent: number; inclusive: boolean }
) {
  const toleranceAmount = calculateToleranceRange(
    simulatedAccount.state.amount,
    args.tolerancePercent
  );

  const assertions = [
    ...buildAssertOwner(simulatedAccount, logLevel),
    tokenAccountAssertion('Amount', {
      value: simulatedAccount.state.amount - toleranceAmount,
      operator: IntegerOperator.GreaterThanOrEqual,
    }),
    tokenAccountAssertion('Amount', {
      value: simulatedAccount.state.amount + toleranceAmount,
      operator: IntegerOperator.LessThanOrEqual,
    }),
    tokenAccountAssertion('Delegate', {
      value: simulatedAccount.state.delegate
        ? publicKey(simulatedAccount.state.delegate)
        : null,
      operator: EquatableOperator.Equal,
    }),
  ];

  let builder = assertTokenAccountMulti(umi, {
    targetAccount: publicKey(simulatedAccount.address),
    logLevel,
    assertions,
  });

  return toWeb3JSInstruction(builder.getInstructions());
}

export const TokenAccountStrategies = {
  buildStrictAssertion,
  buildToleranceAssertion,
  isAccountType,
  isOwner,
  getProgramOwner,
};
