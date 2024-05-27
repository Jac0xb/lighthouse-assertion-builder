import { PublicKey } from '@solana/web3.js';
import {
  EquatableOperator,
  assertUpgradeableLoaderAccount,
  upgradeableProgramDataAssertion,
  upgradeableLoaderStateAssertion,
  upgradableBufferAssertion,
} from 'lighthouse-sdk-legacy';
import { publicKey } from '@metaplex-foundation/umi';
import { LogLevel } from 'lighthouse-sdk-legacy';
import {
  ProgramOwner,
  ResolvedAccount,
  ResolvedUpgradeableLoaderAccount,
} from '../../resolvedAccount';
import { toWeb3JSInstruction } from '../utils';
import { BufferAccountData } from '../../utils/serializer/upgradeableProgramAccount/buffer';
import { ProgramDataAccountData } from '../../utils/serializer/upgradeableProgramAccount/programData';
import { UMI } from '../../utils/umi';

export const UpgradeableLoaderAccountStrategies = {
  buildStrictAssertion: function (
    simulatedAccount: ResolvedUpgradeableLoaderAccount,
    logLevel: LogLevel
  ) {
    if (simulatedAccount.accountType === 'programData') {
      const builder = assertUpgradeableLoaderAccount(UMI, {
        targetAccount: publicKey(simulatedAccount.address),
        logLevel,
        assertion: upgradeableLoaderStateAssertion('ProgramData', [
          upgradeableProgramDataAssertion('UpgradeAuthority', {
            value:
              simulatedAccount.state.upgradeAuthorityAddress.__option === 'Some'
                ? simulatedAccount.state.upgradeAuthorityAddress.value
                : null,
            operator: EquatableOperator.Equal,
          }),
        ]),
      });

      return toWeb3JSInstruction(builder.getInstructions());
    } else if (simulatedAccount.accountType === 'buffer') {
      const builder = assertUpgradeableLoaderAccount(UMI, {
        targetAccount: publicKey(simulatedAccount.address),
        logLevel,
        assertion: upgradeableLoaderStateAssertion('Buffer', [
          upgradableBufferAssertion('Authority', {
            value:
              simulatedAccount.state.authorityAddress.__option === 'Some'
                ? simulatedAccount.state.authorityAddress.value
                : null,
            operator: EquatableOperator.Equal,
          }),
        ]),
      });

      return toWeb3JSInstruction(builder.getInstructions());
    } else {
      throw new Error('Unsupported account type');
    }
  },
  isAccountType: function (
    account: ResolvedAccount
  ): account is ResolvedUpgradeableLoaderAccount {
    return account.programOwner === ProgramOwner.SYSTEM_PROGRAM;
  },
  isOwner: function (
    account: ResolvedUpgradeableLoaderAccount,
    owner: PublicKey
  ) {
    switch (account.accountType) {
      case 'program':
        return false;
      case 'programData':
        if (account.state.upgradeAuthorityAddress.__option === 'Some') {
          return (
            account.state.upgradeAuthorityAddress.value === owner.toBase58()
          );
        } else {
          return false;
        }
      case 'buffer':
        if (account.state.authorityAddress.__option === 'Some') {
          return account.state.authorityAddress.value === owner.toBase58();
        } else {
          return false;
        }
    }
  },
  hasChanged: function (
    actualAccount: ResolvedUpgradeableLoaderAccount,
    simulatedAccount: ResolvedUpgradeableLoaderAccount | null
  ) {
    if (!simulatedAccount) {
      return true;
    }

    if (actualAccount.accountType !== simulatedAccount.accountType) {
      throw new Error('Unsupported account type');
    }

    switch (actualAccount.accountType) {
      case 'program':
        return false;
      case 'buffer': {
        const state = actualAccount.state;
        const simulatedState = simulatedAccount.state as BufferAccountData;

        return (
          state.authorityAddress.__option !==
            simulatedState.authorityAddress.__option ||
          (state.authorityAddress.__option === 'Some' &&
            simulatedState.authorityAddress.__option === 'Some' &&
            state.authorityAddress.value !==
              simulatedState.authorityAddress.value)
        );
      }
      case 'programData': {
        const state = actualAccount.state;
        const simulatedState = simulatedAccount.state as ProgramDataAccountData;

        return (
          state.upgradeAuthorityAddress.__option !==
            simulatedState.upgradeAuthorityAddress.__option ||
          (state.upgradeAuthorityAddress.__option === 'Some' &&
            simulatedState.upgradeAuthorityAddress.__option === 'Some' &&
            state.upgradeAuthorityAddress.value !==
              simulatedState.upgradeAuthorityAddress.value)
        );
      }
      default:
        throw new Error('Unsupported account type');
    }
  },
  getProgramOwner: function () {
    return ProgramOwner.UPGRADEABLE_LOADER_PROGRAM;
  },
};
