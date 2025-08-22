import { useEffect, useRef } from "react";
import { parseEther } from "viem";
import { hardhat } from "viem/chains";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useChallengeState } from "~~/services/store/challengeStore";

// This component is used to monitor the block timestamp and trigger a transaction if the timestamp has not changed for 3 seconds
export const MonitorAndTriggerTx = () => {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;
  const { connector } = useAccount();
  const isBurnerWallet = connector?.id === "burnerWallet";

  const prevTimestampRef = useRef<bigint | null>(null);
  const currentTimestampRef = useRef<bigint | null>(null);

  const { setTimestamp, refetchAssertionStates } = useChallengeState();

  useEffect(() => {
    if (!publicClient || !walletClient) return;

    const pollBlock = async () => {
      try {
        const block = await publicClient.getBlock();
        const newTimestamp = block.timestamp;

        const prev = prevTimestampRef.current;
        const current = currentTimestampRef.current;

        if (prev && newTimestamp === prev) {
          try {
            if (isBurnerWallet && isLocalNetwork) {
              await walletClient.sendTransaction({
                to: walletClient.account.address,
                value: parseEther("0.0000001"),
              });
            }
          } catch (err) {
            console.log("Failed to send tx");
          }
        }

        // Update refs
        prevTimestampRef.current = current;
        currentTimestampRef.current = newTimestamp;
        refetchAssertionStates();

        // Also update current timestamp in Zustand store for global access
        setTimestamp(newTimestamp);
      } catch (err) {
        console.log("Polling error");
      }
    };

    const interval = setInterval(pollBlock, 3000);
    pollBlock(); // Initial call

    return () => clearInterval(interval);
  }, [publicClient, walletClient, isLocalNetwork, isBurnerWallet, setTimestamp, refetchAssertionStates]);

  return null;
};
