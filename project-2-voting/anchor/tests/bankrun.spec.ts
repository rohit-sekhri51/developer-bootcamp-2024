import { startAnchor } from "solana-bankrun";
import { BankrunProvider } from "anchor-bankrun";
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { BN, Program } from "@coral-xyz/anchor";


const IDL = require("../target/idl/voting.json");
import { Voting } from '../target/types/voting';

const VOTING_PROGRAM_ID = new PublicKey("7zwWRPWk9WKrUAcLAZTa4SP3ZJp2197Kq5M4EFTJcMiD");

describe('CREATE a SYSTEM account', () => {
  let context: any;
  let provider: any;
  let votingProgram: any;

  beforeAll( async() => {
     context = await startAnchor("", [{name: "voting", programId: VOTING_PROGRAM_ID}], []);
     provider = new BankrunProvider(context);

     votingProgram = new Program<Voting>(
      IDL,
      provider,
    );
  })

  test("INIT POLL Method", async () => {

    const [pollAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
      votingProgram.programId
    );

    await votingProgram.methods.initializePoll(
      new anchor.BN(1),
        new anchor.BN(0),
        new anchor.BN(1773311998),
        "Test-Poll-123",
        "Description-Test--123",
    ).rpc();

    console.log("Poll Address: " + pollAddress);  // 5bQZosFCgZH2LMLfVYzDVCXG51REgspqkbLK7CJDHbCV 
    const pollAccount = await votingProgram.account.pollAccount.fetch(pollAddress);

    console.log("POLL Account IS: ", pollAccount);
    expect(pollAccount.pollVotingEnd.toNumber()).toBeGreaterThanOrEqual(pollAccount.pollVotingStart.toNumber());
    expect(pollAccount.pollName).toEqual("Test-Poll-123");

  });

  test("INIT Condidate", async() => {

    const [pollAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
      votingProgram.programId
    );

    const [modiAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8),Buffer.from("Howdy Modi")],
      votingProgram.programId
    );
    const [trumpAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8),Buffer.from("Namaste Trump")],
      votingProgram.programId
    );

      const modiTxn = await votingProgram.methods.initializeCandidate(
        new anchor.BN(1),
        "Howdy Modi"
      ).accounts({
        pollAccount: pollAddress
      })
      .rpc();
      
      const trumpTxn = await votingProgram.methods.initializeCandidate(
        new anchor.BN(1),
        "Namaste Trump"
      ).accounts({
        pollAccount: pollAddress
      }).rpc();
      
      console.log("Modi Txn is: " + modiTxn); // explorer (local, dev) - Note: Transactions processed before block 101725 are not available at this time
      console.log("Trump Txn is: " + trumpTxn);

      console.log("Candidate Modi Address: " + modiAddress);  // 9TR9LAe4wFnzspUTT38BUspagW4axp1WuqBqgyWJgctU
      const modiAccount = await votingProgram.account.candidateAccount.fetch(modiAddress);
      console.log("Candidate Account Init: " + JSON.stringify(modiAccount));  // [object Object]

      console.log("Candidate Trump Address: " + trumpAddress);  // DkQpgzrGvWqAikgQXcm2bZVTD3NaxvvfkSXbiqUVZAog
      const trumpAccount = await votingProgram.account.candidateAccount.fetch(trumpAddress);
      console.log("Candidate Account Init: " + JSON.stringify(trumpAccount)); // [object Object]

      expect(modiAccount.candidateName).toEqual("Howdy Modi");   
      expect(trumpAccount.candidateName).toEqual("Namaste Trump");

      expect(modiAccount.candidateVotes.toNumber()).toEqual(0); 
      expect(trumpAccount.candidateVotes.toNumber()).toEqual(0);

      // expect(modiAccount.poll_account.poll_option_index).toEqual(1);
      // expect(trumpAccount.poll_account.poll_option_index).toEqual(1);
      // may not possible as poll_account does not have mut, seeds that why we cant derive from findProgramAddressSync ?
      // how to mix Poll and Candidate fetch ?

  });

  test("VOTE Day - Modi", async() => {

    const [voteForAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8),Buffer.from("Howdy Modi")],
          votingProgram.programId
    );

    // 2 times votes for NaMo
    await votingProgram.methods.vote(
      new anchor.BN(1),
        "Howdy Modi"
    ).rpc();
    await votingProgram.methods.vote(
      new anchor.BN(1),
        "Howdy Modi"
    ).rpc();

    // setInterval(                         // 3rd time fails. Why ?
    // await votingProgram.methods.vote(
    //   new anchor.BN(1),
    //     "Howdy Modi"
    // ).rpc(),5000);

    console.log("Vote For Address: " + voteForAddress);   // 9TR9LAe4wFnzspUTT38BUspagW4axp1WuqBqgyWJgctU
    
    //const voteForAccount = await votingProgram.account.vote.fetch(voteForAddress);  // cant read fetch()
    //console.log("Votes goes to: " + voteForAccount);
    //expect(voteForAccount.candidateVotes).toEqual(1);  // new anchor.BN(1)

    const modiAccount = await votingProgram.account.candidateAccount.fetch(voteForAddress);
    expect(modiAccount.candidateVotes.toNumber()).toEqual(2);  
    expect(modiAccount.candidateName).toEqual("Howdy Modi");

  });

  test("VOTE Day - Trump", async() => {

    const [voteForAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8),Buffer.from("Namaste Trump")],
          votingProgram.programId
    );    // DkQpgzrGvWqAikgQXcm2bZVTD3NaxvvfkSXbiqUVZAog

    await votingProgram.methods.vote(
      new anchor.BN(1),
        "Namaste Trump"
    ).rpc();

    const trumpAccount = await votingProgram.account.candidateAccount.fetch(voteForAddress);
    expect(trumpAccount.candidateVotes.toNumber()).toEqual(1);  
    expect(trumpAccount.candidateName).toEqual("Namaste Trump");

  });

});