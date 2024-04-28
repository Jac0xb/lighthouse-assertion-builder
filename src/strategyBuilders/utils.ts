import { Instruction } from '@metaplex-foundation/umi';
import { toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';

export function toWeb3JSInstruction(ixs: Instruction[]) {
  return ixs.map((ix) => ({
    keys: ix.keys.map((key) => ({
      pubkey: toWeb3JsPublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    programId: toWeb3JsPublicKey(ix.programId),
    data: Buffer.from(ix.data),
  }));
}

export function calculateToleranceRange(
  value: bigint,
  tolerancePercent: number
) {
  return (value * BigInt(tolerancePercent)) / BigInt(100);
}
