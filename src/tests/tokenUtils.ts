import {
  ExtensionType,
  getMintLen,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeMintCloseAuthorityInstruction,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToCheckedInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

export async function createToken2022Mint(
  connection: Connection,
  payer: Keypair,
  decimals: number,
  supply: number = 1,
  mintAuthority: PublicKey = payer.publicKey,
  freezeAuthority: PublicKey = payer.publicKey,
  closeAuthority: PublicKey = payer.publicKey
) {
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  const extensions = [ExtensionType.MintCloseAuthority];
  const mintLen = getMintLen(extensions);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  const associatedTokenAccount = getAssociatedTokenAddressSync(
    mint,
    payer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const ixs = [
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMintCloseAuthorityInstruction(
      mint,
      closeAuthority,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(
      mint,
      decimals,
      mintAuthority,
      freezeAuthority,
      TOKEN_2022_PROGRAM_ID
    ),
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      associatedTokenAccount,
      payer.publicKey,
      mint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    ),
    createMintToCheckedInstruction(
      mint,
      associatedTokenAccount,
      payer.publicKey,
      supply,
      0,
      undefined,
      TOKEN_2022_PROGRAM_ID
    ),
    createSetAuthorityInstruction(
      mint,
      mintAuthority,
      AuthorityType.MintTokens,
      null,
      [],
      TOKEN_2022_PROGRAM_ID
    ),
    createSetAuthorityInstruction(
      mint,
      mintAuthority,
      AuthorityType.FreezeAccount,
      null,
      [],
      TOKEN_2022_PROGRAM_ID
    ),
  ];

  const transaction = new Transaction().add(...ixs);

  return { mintKeypair, transaction, ixs };
}

export async function createTokenMint(
  connection: Connection,
  payer: Keypair,
  decimals: number,
  supply: number = 1,
  mintAuthority: PublicKey = payer.publicKey,
  freezeAuthority: PublicKey = payer.publicKey,
  closeAuthority: PublicKey = payer.publicKey
) {
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const associatedTokenAccount = getAssociatedTokenAddressSync(
    mint,
    payer.publicKey,
    false
  );

  const ixs = [
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
      programId: TOKEN_PROGRAM_ID,
    }),
    // createInitializeMintCloseAuthorityInstruction(
    //   mint,
    //   closeAuthority,
    //   TOKEN_2022_PROGRAM_ID
    // ),
    createInitializeMintInstruction(
      mint,
      decimals,
      mintAuthority,
      freezeAuthority
    ),
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      associatedTokenAccount,
      payer.publicKey,
      mint
    ),
    createMintToCheckedInstruction(
      mint,
      associatedTokenAccount,
      payer.publicKey,
      supply,
      0,
      undefined
    ),
    // createSetAuthorityInstruction(
    //   mint,
    //   mintAuthority,
    //   AuthorityType.MintTokens,
    //   null,
    //   []
    // ),
    // createSetAuthorityInstruction(
    //   mint,
    //   mintAuthority,
    //   AuthorityType.FreezeAccount,
    //   null,
    //   []
    // ),
  ];

  const transaction = new Transaction().add(...ixs);

  return { mintKeypair, transaction, ixs };
}
