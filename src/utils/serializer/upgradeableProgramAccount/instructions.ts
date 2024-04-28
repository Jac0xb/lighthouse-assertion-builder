import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  StakeProgram,
  TransactionInstruction,
} from '@solana/web3.js';

export function setUpgradeAuthorityInstruction(
  programData: PublicKey,
  currentAuthority: PublicKey,
  newAuthority: PublicKey | null
): TransactionInstruction {
  const keys = [
    { pubkey: programData, isSigner: false, isWritable: true },
    { pubkey: currentAuthority, isSigner: true, isWritable: false },
  ];

  if (newAuthority) {
    keys.push({ pubkey: newAuthority, isSigner: false, isWritable: false });
  }

  return {
    keys,
    programId: new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111'),
    data: Buffer.from([4, 0, 0, 0]),
  };
}

export function setUpgradeBufferAuthorityCheckedInstruction(
  programData: PublicKey,
  currentAuthority: PublicKey,
  newAuthority: PublicKey
): TransactionInstruction {
  const keys = [
    { pubkey: programData, isSigner: false, isWritable: true },
    { pubkey: currentAuthority, isSigner: true, isWritable: false },
    { pubkey: newAuthority, isSigner: true, isWritable: false },
  ];

  return {
    keys,
    programId: new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111'),
    data: Buffer.from([7, 0, 0, 0]),
  };
}
