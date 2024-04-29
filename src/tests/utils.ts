import { TransactionInstruction } from '@solana/web3.js';
import {
  getMemoryWriteInstructionDataSerializer,
  getMemoryCloseInstructionDataSerializer,
  getAssertAccountDataInstructionDataSerializer,
  getAssertAccountDeltaInstructionDataSerializer,
  getAssertAccountInfoInstructionDataSerializer,
  getAssertAccountInfoMultiInstructionDataSerializer,
  getAssertMintAccountInstructionDataSerializer,
  getAssertMintAccountMultiInstructionDataSerializer,
  getAssertTokenAccountMultiInstructionDataSerializer,
  getAssertStakeAccountMultiInstructionDataSerializer,
  getAssertUpgradeableLoaderAccountMultiInstructionDataSerializer,
  getAssertSysvarClockInstructionDataSerializer,
  getAssertMerkleTreeAccountInstructionDataSerializer,
  getAssertBubblegumTreeConfigAccountInstructionDataSerializer,
} from 'lighthouse-sdk-legacy';

export function deserializeInstruction(instruction: TransactionInstruction) {
  const instructionData = instruction.data;
  const discriminator = instructionData.readUInt8(0);

  switch (discriminator) {
    case 0:
      return {
        name: 'MemoryWrite',
        data: getMemoryWriteInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };

    case 1:
      return {
        name: 'MemoryClose',
        data: getMemoryCloseInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 2:
      return {
        name: 'AssertAccountData',
        targetAccount: instruction.keys[0].pubkey,
        data: getAssertAccountDataInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 3:
      return {
        name: 'AssertAccountDelta',
        targetAccount: instruction.keys[0].pubkey,
        data: getAssertAccountDeltaInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 4:
      return {
        name: 'AssertAccountInfo',
        targetAccount: instruction.keys[0].pubkey,
        data: getAssertAccountInfoInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 5:
      return {
        name: 'AssertAccountInfoMulti',
        targetAccount: instruction.keys[0].pubkey,
        data: getAssertAccountInfoMultiInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 6:
      return {
        name: 'AssertMintAccount',
        targetAccount: instruction.keys[0].pubkey,
        data: getAssertMintAccountInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 7: {
      return {
        name: 'AssertMintAccountMulti',
        targetAccount: instruction.keys[0].pubkey,
        data: getAssertMintAccountMultiInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    }
    case 8:
      return {
        name: 'AssertTokenAccount',
        targetAccount: instruction.keys[0].pubkey,
        data: getAssertAccountDataInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 9:
      return {
        name: 'AssertTokenAccountMulti',
        targetAccount: instruction.keys[0].pubkey,
        data: getAssertTokenAccountMultiInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 10:
      return {
        name: 'AssertStakeAccount',
        targetAccount: instruction.keys[0].pubkey,
        data: getMemoryWriteInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 11:
      return {
        name: 'AssertStakeAccountMulti',
        targetAccount: instruction.keys[0].pubkey,
        data: getAssertStakeAccountMultiInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 12:
      return {
        name: 'AssertUpgradeableLoaderAccount',
        targetAccount: instruction.keys[0].pubkey,
        data: getMemoryWriteInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 13:
      return {
        name: 'AssertUpgradeableLoaderAccountMulti',
        targetAccount: instruction.keys[0].pubkey,
        data: getAssertUpgradeableLoaderAccountMultiInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 14:
      return {
        name: 'AssertSysvarClock',
        targetAccount: instruction.keys[0].pubkey,
        data: getAssertSysvarClockInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 15:
      return {
        name: 'AssertMerkleTreeAccount',
        data: getAssertMerkleTreeAccountInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
    case 16:
      return {
        name: 'AssertBubblegumTreeConfigAccount',
        data: getAssertBubblegumTreeConfigAccountInstructionDataSerializer().deserialize(
          instructionData
        )[0],
      };
  }
}
