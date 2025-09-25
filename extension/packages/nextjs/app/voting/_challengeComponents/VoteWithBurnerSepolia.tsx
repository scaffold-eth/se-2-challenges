"use client";

import { useEffect, useState } from "react";
import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createPublicClient, encodeFunctionData, http, toHex } from "viem";
import { EntryPointVersion, entryPoint07Address } from "viem/account-abstraction";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { useChallengeState } from "~~/services/store/challengeStore";
import {
  hasStoredProof,
  hasStoredTransactionResult,
  loadProofFromLocalStorage,
  loadTransactionResultFromLocalStorage,
  saveTransactionResultToLocalStorage,
} from "~~/utils/proofStorage";
import { notification } from "~~/utils/scaffold-eth";

const pimlicoUrl = `https://api.pimlico.io/v2/${sepolia.id}/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`;

const CHAIN_USED = sepolia;
//// Checkpoint 10 //////
// const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";

const pimlicoClient = createPimlicoClient({
  chain: CHAIN_USED,
  transport: http(pimlicoUrl),
  entryPoint: {
    address: entryPoint07Address,
    version: "0.7" as EntryPointVersion,
  },
});

const createSmartAccount = async (): Promise<{
  smartAccountClient: any;
  smartAccount: `0x${string}`;
  walletOwner: `0x${string}`;
}> => {
  try {
    //// Checkpoint 10 //////
    void [createSmartAccountClient, toSafeSmartAccount, createPublicClient, generatePrivateKey, privateKeyToAccount]; // placeholder

    throw new Error("Checkpoint 10: implement createSmartAccount"); // placeholder
  } catch (error) {
    console.error("Error creating smart account:", error);
    throw error;
  }
};

const voteOnSepolia = async ({
  proofData,
  contractInfo,
  contractAddress,
  smartAccountClient,
}: {
  proofData: any;
  contractInfo: any;
  contractAddress: any;
  smartAccountClient: any;
}): Promise<{ userOpHash: `0x${string}` }> => {
  if (!contractInfo && !contractAddress) throw new Error("Contract not found");
  //// Checkpoint 10 //////
  void [encodeFunctionData, toHex, proofData, smartAccountClient]; // placeholder

  throw new Error("Checkpoint 10: implement voteOSepolia"); // placeholder
};

export const VoteWithBurnerSepolia = ({ contractAddress }: { contractAddress?: `0x${string}` }) => {
  const [smartAccount, setSmartAccount] = useState<`0x${string}` | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [hasProofStored, setHasProofStored] = useState<boolean>(false);
  const [hasSuccessfulVote, setHasSuccessfulVote] = useState<boolean>(false);
  const [walletOwner, setWalletOwner] = useState<`0x${string}` | null>(null);
  const [smartAccountClient, setSmartAccountClient] = useState<any>(null);
  const [votedSmartAccount, setVotedSmartAccount] = useState<`0x${string}` | null>(null);
  const { proofData, setProofData } = useChallengeState();
  const { address: userAddress } = useAccount();

  const { data: contractInfo } = useDeployedContractInfo({ contractName: "Voting" });

  // Reset client and owner when account/contract changes
  useEffect(() => {
    const effectiveContractAddress = contractAddress || contractInfo?.address;
    if (!effectiveContractAddress || !userAddress) {
      setSmartAccountClient(null);
      setSmartAccount(null);
      setWalletOwner(null);
    } else {
      setSmartAccountClient(null);
      setSmartAccount(null);
      setWalletOwner(null);
    }
  }, [contractAddress, contractInfo?.address, userAddress]);

  useEffect(() => {
    const checkAndLoadStoredData = () => {
      const effectiveContractAddress = contractAddress || contractInfo?.address;
      if (effectiveContractAddress && userAddress) {
        const proofExists = hasStoredProof(effectiveContractAddress, userAddress);
        const transactionResultExists = hasStoredTransactionResult(effectiveContractAddress, userAddress);

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

        if (transactionResultExists) {
          try {
            const storedResult = loadTransactionResultFromLocalStorage(effectiveContractAddress, userAddress);
            if (storedResult) {
              setTxStatus(storedResult.success ? "success" : "error");
              setHasSuccessfulVote(Boolean(storedResult.success));
              const fromReceiptSA = storedResult.receipt?.smartAccountAddress as `0x${string}` | undefined;
              setVotedSmartAccount((fromReceiptSA as `0x${string}`) || null);
              // We only display the smart account publicly; owner is kept internal
            }
          } catch (error) {
            console.error("Error loading transaction result:", error);
          }
        } else {
          setHasSuccessfulVote(false);
          setVotedSmartAccount(null);
          // Reset displayed smart account
        }
      } else {
        setHasProofStored(false);
        setVotedSmartAccount(null);
      }
    };

    checkAndLoadStoredData();
  }, [contractAddress, contractInfo?.address, userAddress, proofData, setProofData]);

  return (
    <div className="bg-base-100 shadow rounded-xl p-6 space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-bold">Vote</h2>
        <p className="text-sm opacity-70">
          Use an ERC-4337 smart account to submit the on-chain vote with the proof and let the tx be paid by a
          paymaster.
        </p>
      </div>

      {hasSuccessfulVote && votedSmartAccount && (
        <div className="flex items-center gap-2 justify-center">
          <span className="text-sm">Voted With Smart Account:</span>
          <Address address={votedSmartAccount} />
        </div>
      )}

      <div className="flex justify-center">
        <button
          className="btn btn-primary"
          disabled={!hasProofStored || !proofData || txStatus === "pending" || hasSuccessfulVote}
          onClick={async () => {
            try {
              if (!proofData) {
                console.error("Please generate proof first");
                return;
              }
              if (!contractInfo && !contractAddress) throw new Error("Contract not found");

              setTxStatus("pending");
              const effectiveContractAddress = contractAddress || contractInfo?.address;

              let client = smartAccountClient;
              let currentSmartAccount = smartAccount;
              let currentWalletOwner = walletOwner;

              if (!client) {
                try {
                  const created = await createSmartAccount();
                  client = created.smartAccountClient;
                  currentSmartAccount = created.smartAccount;
                  currentWalletOwner = created.walletOwner;
                  setSmartAccountClient(client);
                  setSmartAccount(currentSmartAccount);
                  setWalletOwner(currentWalletOwner);
                } catch (err: any) {
                  if (typeof err?.message === "string" && err.message.startsWith("Checkpoint 10")) {
                    notification.info("Implement createSmartAccount is a TODO (Checkpoint 10). Please implement it.");
                    setTxStatus("idle");
                    return;
                  }
                  throw err;
                }
              }

              const { userOpHash } = await voteOnSepolia({
                proofData,
                contractInfo,
                contractAddress,
                smartAccountClient: client,
              });

              if (!userOpHash) throw new Error("Receipt or user operation hash not found");

              try {
                const receipt = await pimlicoClient.waitForUserOperationReceipt({
                  hash: userOpHash,
                });
                if (receipt.success) {
                  setTxStatus("success");
                  setHasSuccessfulVote(true);

                  if (effectiveContractAddress && userAddress) {
                    const enhancedReceipt = {
                      ...receipt,
                      smartAccountAddress: currentSmartAccount,
                      walletOwner: currentWalletOwner,
                    };
                    saveTransactionResultToLocalStorage(
                      userOpHash,
                      true,
                      effectiveContractAddress,
                      userAddress,
                      enhancedReceipt,
                    );
                    setVotedSmartAccount((currentSmartAccount as `0x${string}`) || null);
                    // owner is not displayed; keep internal if needed
                  }
                } else {
                  console.error("User operation failed:", receipt);
                  setTxStatus("error");

                  if (effectiveContractAddress && userAddress) {
                    const enhancedReceipt = {
                      ...receipt,
                      smartAccountAddress: currentSmartAccount,
                      walletOwner: currentWalletOwner,
                    };
                    saveTransactionResultToLocalStorage(
                      userOpHash,
                      false,
                      effectiveContractAddress,
                      userAddress,
                      enhancedReceipt,
                      "User operation failed",
                    );
                    setVotedSmartAccount((currentSmartAccount as `0x${string}`) || null);
                    // owner is not displayed; keep internal if needed
                  }
                }
              } catch (receiptError: any) {
                console.warn("Error waiting for receipt, but transaction may have succeeded:", receiptError);

                if (receiptError.name === "WaitForUserOperationReceiptTimeoutError") {
                  setTxStatus("success");
                  setHasSuccessfulVote(true);
                  if (effectiveContractAddress && userAddress) {
                    saveTransactionResultToLocalStorage(
                      userOpHash,
                      true,
                      effectiveContractAddress,
                      userAddress,
                      {
                        userOpHash,
                        timedOut: true,
                        smartAccountAddress: currentSmartAccount,
                        walletOwner: currentWalletOwner,
                      },
                      "Transaction submitted successfully but receipt timed out",
                    );
                    setVotedSmartAccount((currentSmartAccount as `0x${string}`) || null);
                    // owner is not displayed; keep internal if needed
                  }
                } else {
                  throw receiptError;
                }
              }
            } catch (e) {
              console.error("Error voting:", e);
              setTxStatus("error");

              const effectiveContractAddress = contractAddress || contractInfo?.address;
              if (effectiveContractAddress && userAddress) {
                saveTransactionResultToLocalStorage(
                  "",
                  false,
                  effectiveContractAddress,
                  userAddress,
                  { smartAccountAddress: smartAccount, walletOwner: walletOwner },
                  e instanceof Error ? e.message : "Unknown error occurred",
                );
              }
            }
          }}
        >
          {txStatus === "pending" ? "Voting..." : hasSuccessfulVote ? "Already voted" : "Vote with smart account"}
        </button>
      </div>
    </div>
  );
};
