"use client";

import { useEffect, useState } from "react";
import { Contract, HDNodeWallet, JsonRpcProvider, Wallet } from "ethers";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { useChallengeState } from "~~/services/store/challengeStore";
import {
  hasStoredProof,
  loadBurnerWalletFromLocalStorage,
  loadProofFromLocalStorage,
  saveBurnerWalletToLocalStorage,
} from "~~/utils/proofStorage";

////// Checkpoint 9 //////
// import {  parseEther } from "ethers";

type LocalProofData = {
  proof: Uint8Array;
  publicInputs: any[];
};

const sendVoteWithBurner = async ({
  contract,
  provider,
  walletAddress,
  proofData,
}: {
  contract: Contract;
  provider: JsonRpcProvider;
  walletAddress: string;
  proofData: LocalProofData;
}): Promise<string> => {
  ////// Checkpoint 9 //////
  console.debug(
    "Checkpoint 9",
    !!contract,
    !!provider,
    !!walletAddress,
    !!proofData,
    uint8ArrayToHexString(new Uint8Array(0)),
  ); // placeholder
  throw new Error("Checkpoint 9"); // placeholder
};

export const VoteWithBurnerHardhat = ({ contractAddress }: { contractAddress?: `0x${string}` }) => {
  const [burnerWallet, setBurnerWallet] = useState<Wallet | HDNodeWallet | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [hasProofStored, setHasProofStored] = useState<boolean>(false);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const { proofData, setProofData } = useChallengeState();
  const { address: userAddress } = useAccount();

  const generateBurnerWallet = () => {
    ////// Checkpoint 9 //////
    const wallet = undefined as unknown as Wallet; // placeholder

    setBurnerWallet(wallet);

    const effectiveContractAddress = contractAddress || contractInfo?.address;
    if (effectiveContractAddress && userAddress) {
      saveBurnerWalletToLocalStorage(wallet.privateKey, wallet.address, effectiveContractAddress, userAddress);
    }

    return wallet;
  };

  const { data: contractInfo } = useDeployedContractInfo({ contractName: "Voting" });

  const { data: voteCastEvents } = useScaffoldEventHistory({
    contractName: "Voting",
    eventName: "VoteCast",
    watch: true,
    enabled: !!burnerWallet?.address,
  });

  useEffect(() => {
    if (burnerWallet?.address && voteCastEvents) {
      const hasVotedAlready = voteCastEvents.some(
        event => event.args?.voter?.toLowerCase() === burnerWallet.address.toLowerCase(),
      );
      setHasVoted(hasVotedAlready);
    } else {
      setHasVoted(false);
    }
  }, [burnerWallet?.address, voteCastEvents]);

  useEffect(() => {
    const checkAndLoadStoredProof = () => {
      const effectiveContractAddress = contractAddress || contractInfo?.address;
      if (effectiveContractAddress && userAddress) {
        const proofExists = hasStoredProof(effectiveContractAddress, userAddress);
        setHasProofStored(proofExists);

        if (proofExists && !proofData) {
          try {
            const storedProof = loadProofFromLocalStorage(effectiveContractAddress, userAddress);
            if (storedProof) {
              setProofData(storedProof);
            }
          } catch (error) {
            console.error("Error auto-loading proof:", error);
          }
        }
      } else {
        setHasProofStored(false);
      }
    };

    checkAndLoadStoredProof();
  }, [contractAddress, contractInfo?.address, userAddress, proofData, setProofData]);

  useEffect(() => {
    const effectiveContractAddress = contractAddress || contractInfo?.address;
    if (effectiveContractAddress && userAddress) {
      try {
        const storedBurnerWallet = loadBurnerWalletFromLocalStorage(effectiveContractAddress, userAddress);
        if (storedBurnerWallet) {
          setBurnerWallet(new Wallet(storedBurnerWallet.privateKey));
        } else {
          setBurnerWallet(null);
        }
      } catch (error) {
        console.error("Error auto-loading burner wallet:", error);
        setBurnerWallet(null);
      }
    } else {
      setBurnerWallet(null);
    }
  }, [contractAddress, contractInfo?.address, userAddress]);

  return (
    <div className="bg-base-100 shadow rounded-xl p-6 space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-bold">Vote</h2>
        <p className="text-sm opacity-70">Use a local burner wallet to submit the on-chain vote with the proof.</p>
      </div>

      {burnerWallet && (
        <div className="flex items-center gap-2 justify-center">
          <span className="text-sm">Burner Wallet:</span>
          <Address address={burnerWallet.address} />
        </div>
      )}

      <div className="flex justify-center">
        <button
          className="btn btn-primary"
          disabled={!hasProofStored || !proofData || txStatus === "pending" || hasVoted}
          onClick={async () => {
            try {
              if (!proofData) {
                console.error("Please generate proof first");
                return;
              }

              setTxStatus("pending");

              const wallet = (burnerWallet ?? generateBurnerWallet()) as Wallet | HDNodeWallet;
              const provider = new JsonRpcProvider("http://localhost:8545");
              const address = (contractAddress || contractInfo?.address) as string | undefined;
              if (!address) throw new Error("Contract not found");
              const abi = (contractInfo?.abi as any) || [];
              const contract = new Contract(address, abi, wallet.connect(provider));

              await sendVoteWithBurner({
                contract,
                provider,
                walletAddress: wallet.address,
                proofData: proofData as LocalProofData,
              });

              setTxStatus("success");
            } catch (e) {
              console.error("Error voting:", e);
              setTxStatus("error");
            }
          }}
        >
          {txStatus === "pending" ? "Voting..." : hasVoted ? "Already voted" : "Vote with burner wallet"}
        </button>
      </div>
    </div>
  );
};

const uint8ArrayToHexString = (buffer: Uint8Array): `0x${string}` => {
  const hex: string[] = [];
  buffer.forEach(function (i) {
    let h = i.toString(16);
    if (h.length % 2) {
      h = "0" + h;
    }
    hex.push(h);
  });
  return `0x${hex.join("")}`;
};
