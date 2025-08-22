import { parseEther } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useGlobalState } from "~~/services/store/store";
import { INITIAL_ETH_PRICE, SIMPLE_ORACLE_ABI, SIMPLE_ORACLE_BYTECODE } from "~~/utils/constants";
import { notification } from "~~/utils/scaffold-eth";

export const AddOracleButton = () => {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);

  const { writeContractAsync: writeWhitelistOracle } = useScaffoldWriteContract({ contractName: "WhitelistOracle" });

  const handleAddOracle = async () => {
    if (!walletClient || !publicClient) {
      notification.error("Please connect wallet and enter both oracle owner address and initial price");
      return;
    }

    try {
      // Step 1: Deploy new SimpleOracle instance
      const deployTxHash = await walletClient.deployContract({
        abi: SIMPLE_ORACLE_ABI,
        bytecode: SIMPLE_ORACLE_BYTECODE,
        args: [],
      });

      // Wait for deployment transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: deployTxHash,
      });

      const oracleAddress = receipt.contractAddress;

      if (!oracleAddress) {
        throw new Error("Failed to get deployed contract address");
      }

      // Step 2: Add oracle to whitelist
      await writeWhitelistOracle({
        functionName: "addOracle",
        args: [oracleAddress],
      });

      // Step 3: Set initial price on the newly deployed oracle
      const initialPrice = nativeCurrencyPrice > 0 ? nativeCurrencyPrice : INITIAL_ETH_PRICE;
      const priceInWei = parseEther(initialPrice.toString());

      const setPriceTxHash = await walletClient.writeContract({
        address: oracleAddress,
        abi: SIMPLE_ORACLE_ABI,
        functionName: "setPrice",
        args: [priceInWei],
      });

      await publicClient.waitForTransactionReceipt({
        hash: setPriceTxHash,
      });
    } catch (error: any) {
      console.log("Error adding oracle:", error);
    }
  };

  return (
    <button className="btn btn-primary h-full btn-sm font-normal gap-1" onClick={handleAddOracle}>
      <PlusIcon className="h-4 w-4" />
      <span>Add Oracle Node</span>
    </button>
  );
};
