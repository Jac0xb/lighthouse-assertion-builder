export const tokenAccountTest = async (
  connection: Connection,
  keypair: Keypair
) => {
  // const { mintKeypair, transaction, ixs } = await createTokenMint(
  //   connection,
  //   keypair,
  //   0,
  //   10
  // );

  // const result = await sendAndConfirmTransaction(connection, transaction, [
  //   keypair,
  //   mintKeypair,
  // ]);

  // Token2022 Mint
  const mint = new PublicKey('FBjLBGbW67XnRnuEBdwDHTKvX9KAVK7bdGezPKQyzyK5');

  // Token Mint
  // const mint = new PublicKey('2mwvxq4hJ2cSiiE9dyQq8QsqbgYzoZTRhkrva5WvcdvE');

  // Token Mint (With freeze + close authority)
  // const mint = new PublicKey('AemyCg9jpbWyWzaWnYZhtbisr4HdtfBFJHf9bCSbBnNc');

  const mintAccount = (await connection.getAccountInfo(mint))!;

  const destination = Keypair.generate();

  const destTokenAccount = getAssociatedTokenAddressSync(
    mint,
    destination.publicKey,
    false,
    mintAccount.owner,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const sourceTokenAccount = getAssociatedTokenAddressSync(
    mint,
    keypair.publicKey,
    false,
    mintAccount.owner,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const createTokenAccountIx = createAssociatedTokenAccountInstruction(
    keypair.publicKey,
    destTokenAccount,
    destination.publicKey,
    mint,
    mintAccount.owner
  );

  createTokenAccountIx.keys.find((key) => key.pubkey.equals(mint))!.isWritable =
    true;

  const tx = new VersionedTransaction(
    new TransactionMessage({
      instructions: [
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: keypair.publicKey,
          lamports: 10,
        }),
        createTokenAccountIx,
        createTransferCheckedInstruction(
          sourceTokenAccount,
          mint,
          destTokenAccount,
          keypair.publicKey,
          5,
          0,
          undefined,
          mintAccount.owner
        ),
      ],
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      payerKey: keypair.publicKey,
    }).compileToV0Message()
  );

  await injectLighthouseIntoTransaction(connection, tx);
};
