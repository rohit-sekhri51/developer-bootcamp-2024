import * as anchor from '@coral-xyz/anchor';
import type { Program } from '@coral-xyz/anchor';
import { getCustomErrorMessage } from '@solana-developers/helpers';
import { assert } from 'chai';
import type { Favorites } from '../target/types/favorites';
import { systemProgramErrors } from './system-errors';
const web3 = anchor.web3;

describe('Favorites', () => {
  // Use the cluster and the keypair from Anchor.toml
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const user = (provider.wallet as anchor.Wallet).payer;
  const someRandomGuy = anchor.web3.Keypair.generate();
  const program = anchor.workspace.Favorites as Program<Favorites>;

  // Here's what we want to write to the blockchain
  const favoriteNumber = new anchor.BN(51);
  const favoriteColor = 'neelam';   // blue color
  const favoriteHobbies = ['singing', 'cricket', 'audi-S5','yoga'];

  // We don't need to airdrop if we're using the local cluster / devnet wallet has SOL
  // because the local cluster gives us 85 billion dollars worth of SOL
  before(async () => {
    const balance = await provider.connection.getBalance(user.publicKey);
    const balanceInSOL = balance / web3.LAMPORTS_PER_SOL;
    const formattedBalance = new Intl.NumberFormat().format(balanceInSOL);
    console.log(`Balance: ${formattedBalance} SOL`);
    console.log(`Balance: ${balanceInSOL} SOL`);
  });

  it('Writes our favorites to the blockchain', async () => {
    await program.methods
      // set_favourites in Rust becomes setFavorites in TypeScript
      .setFavorites(favoriteNumber, favoriteColor, favoriteHobbies)
      // Sign the transaction
      .signers([user])
      // Send the transaction to the cluster or RPC
      .rpc();

    // Find the PDA for the user's favorites
    const favoritesPdaAndBump = web3.PublicKey.findProgramAddressSync([Buffer.from('favorites'), user.publicKey.toBuffer()], program.programId);
    const favoritesPda = favoritesPdaAndBump[0];
    const dataFromPda = await program.account.favorites.fetch(favoritesPda);

    console.log(`Fav Number is ${dataFromPda.number}`);
    console.log(`Fav Color is ${dataFromPda.color}`);
    console.log(`Fav Hobbies is ${dataFromPda.hobbies}`);

    // And make sure it matches!
    assert.equal(dataFromPda.color, favoriteColor);
    // A little extra work to make sure the BNs are equal
    assert.equal(dataFromPda.number.toString(), favoriteNumber.toString());
    // And check the hobbies too
    assert.deepEqual(dataFromPda.hobbies, favoriteHobbies);

  });

  it('Updates the favorites', async () => {
    const newFavoriteHobbies = ['medation', 'teaching', 'coding', 'swimming'];
    const newFavoriteNumber = new anchor.BN(21);
    const newFavoriteColor = 'panna';   // green color
    try {
     await program.methods.setFavorites(newFavoriteNumber, newFavoriteColor, newFavoriteHobbies)
     .signers([user]).rpc();

     // Find the PDA for the user's favorites
    const favoritesPdaAndBump = web3.PublicKey.findProgramAddressSync([Buffer.from('favorites'), user.publicKey.toBuffer()], program.programId);
    const favoritesPda = favoritesPdaAndBump[0];
    const dataFromPdaUp = await program.account.favorites.fetch(favoritesPda);

    console.log(`Fav Updated Number is ${dataFromPdaUp.number}`);
    console.log(`Fav Updated Color is ${dataFromPdaUp.color}`);
    console.log(`Fav Updated Hobbies is ${dataFromPdaUp.hobbies}`);
    } catch (error) {
      console.error((error as Error).message);
      const customErrorMessage = getCustomErrorMessage(systemProgramErrors, error);
      throw new Error(customErrorMessage);
    }
  });

  it('Rejects transactions from unauthorized signers', async () => {
    try {
      await program.methods
        // set_favourites in Rust becomes setFavorites in TypeScript
        .setFavorites(favoriteNumber, favoriteColor, favoriteHobbies)
        // Sign the transaction
        .signers([someRandomGuy])
        // Send the transaction to the cluster or RPC
        .rpc();
    } catch (error) {
      const errorMessage = (error as Error).message;
      assert.isTrue(errorMessage.includes('unknown signer'));
      console.log(`Error Message is: ${errorMessage.toString()}`);
    }
  });
});
