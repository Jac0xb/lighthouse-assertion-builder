import { PublicKey } from '@solana/web3.js';
import {
  EquatableOperator,
  IntegerOperator,
  mintAccountAssertion,
  assertMintAccountMulti,
} from 'lighthouse-sdk-legacy';
import { publicKey } from '@metaplex-foundation/umi';
import { LogLevel } from 'lighthouse-sdk-legacy';
import {
  ProgramOwner,
  ResolvedAccount,
  ResolvedSplTokenProgramMintAccount,
} from '../../resolvedAccount';
import { toWeb3JSInstruction } from '../utils';
import { UMI } from '../../utils/umi';

function isAccountType(
  account: ResolvedAccount
): account is ResolvedSplTokenProgramMintAccount {
  return (
    (account.programOwner === ProgramOwner.SPL_TOKEN_PROGRAM ||
      account.programOwner === ProgramOwner.SPL_TOKEN_2022_PROGRAM) &&
    account.accountType === 'mint'
  );
}

function isOwner(
  account: ResolvedSplTokenProgramMintAccount,
  owner: PublicKey
) {
  return (
    ((account.state.freezeAuthority &&
      account.state.freezeAuthority.equals(owner)) ||
      (account.state.mintAuthority &&
        account.state.mintAuthority.equals(owner))) ??
    false
  );
}

function getProgramOwner() {
  return ProgramOwner.SPL_TOKEN_PROGRAM;
}

function buildStrictAssertion(
  simulatedAccount: ResolvedSplTokenProgramMintAccount,
  logLevel: LogLevel
) {
  const assertions = [
    mintAccountAssertion('Supply', {
      value: simulatedAccount.state.supply,
      operator: IntegerOperator.Equal,
    }),
    mintAccountAssertion('FreezeAuthority', {
      value: simulatedAccount.state.freezeAuthority
        ? publicKey(simulatedAccount.state.freezeAuthority)
        : null,
      operator: EquatableOperator.Equal,
    }),
    mintAccountAssertion('MintAuthority', {
      value: simulatedAccount.state.mintAuthority
        ? publicKey(simulatedAccount.state.mintAuthority)
        : null,
      operator: EquatableOperator.Equal,
    }),
  ];

  let builder = assertMintAccountMulti(UMI, {
    targetAccount: publicKey(simulatedAccount.address),
    logLevel,
    assertions,
  });

  return toWeb3JSInstruction(builder.getInstructions());
}

export const MintAccountStrategies = {
  buildStrictAssertion,
  getProgramOwner,
  isAccountType,
  isOwner,
};
