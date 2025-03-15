"use client";

import {
  getJournalProgram,
  getJournalProgramId,
  JournalIDL,
} from "@journal/anchor";
import { Program } from "@coral-xyz/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { Cluster, PublicKey } from "@solana/web3.js";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useCluster } from "../cluster/cluster-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { useTransactionToast } from "../ui/ui-layout";
import { useMemo } from "react";
import { get } from "http";

interface CreateEntryArgs {
  title: string;
  message: string;
  owner: PublicKey;
}

export function useJournalProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const provider = useAnchorProvider();
  const programId = useMemo(
    () => getJournalProgramId(cluster.network as Cluster),
    [cluster]
  );
  const program = getJournalProgram(provider);

  console.log("Program Id is: " + programId + " Program is: " + program.account.journalEntryState.all());
  console.log("connection is: " + connection.rpcEndpoint + " cluster is: " + cluster.name);

  const accounts = useQuery({
    queryKey: ["journal", "all", { cluster }],
    queryFn: () => program.account.journalEntryState.all(),
  });

  const getProgramAccount = useQuery({
    queryKey: ["get-program-account", { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });
  
  console.log("accounts is: " + accounts.data + " getProgramAccount is: " + JSON.stringify(getProgramAccount.data?.value));

  const createEntry = useMutation<string, Error, CreateEntryArgs>({
    mutationKey: ["journalEntry", "create", { cluster }],
    mutationFn: ({ title, message, owner }) => {
      console.log(owner + " Reached before createJournalEntry " + title);
      return program.methods.createJournalEntry(title, message).rpc();    // args needed to derive the PDA on blockchain side
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      accounts.refetch();
    },
    onError: (error) => {
      console.log("Errorrrrrr......");
      toast.error(`Failed to CREATE journal entry: ${error.message}`);
    },
  });
  console.log("End of FN " + createEntry);
  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    createEntry,
  };
}

export function useJournalProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const { program, accounts } = useJournalProgram();
  const programId = new PublicKey(
    "5YiRmtvpJ4Fh1MQHEcWZCceGwQFLjn9cNqNgum9BScHx"
  );

  const accountQuery = useQuery({
    queryKey: ["journal", "fetch", { cluster, account }],
    queryFn: () => program.account.journalEntryState.fetch(account),
  });

  const updateEntry = useMutation<string, Error, CreateEntryArgs>({
    mutationKey: ["journalEntry", "update", { cluster }],
    mutationFn: async ({ title, message, owner }) => {
      const [journalEntryAddress] = await PublicKey.findProgramAddress(   // PDA not used in the FE
        [Buffer.from(title), owner.toBuffer()],
        programId
      );

      return program.methods.updateJournalEntry(title, message).rpc();    // args needed to derive the PDA on blockchain side
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      accounts.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update journal entry: ${error.message}`);
    },
  });

  const deleteEntry = useMutation({         // no need <tring, Error, CreateEntryArgs>
    mutationKey: ["journal", "deleteEntry", { cluster, account }],
    mutationFn: (title: string) =>          // no need async coz title already pre-populated
      program.methods.deleteJournalEntry(title).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx);
      return accounts.refetch();
    },
  });

  return {
    accountQuery,
    updateEntry,
    deleteEntry,
  };
}
