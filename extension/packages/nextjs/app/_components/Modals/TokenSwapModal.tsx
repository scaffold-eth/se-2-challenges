import { useState } from "react";
import TooltipInfo from "../TooltipInfo";
import { Address, parseEther } from "viem";
import { ArrowDownIcon, ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { Balance, IntegerInput } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { tokenName } from "~~/utils/constant";

type TokenSwapModalProps = {
  tokenBalance: string;
  connectedAddress: string;
  ETHprice: string;
  modalId: string;
};

export const TokenSwapModal = ({ tokenBalance, connectedAddress, ETHprice, modalId }: TokenSwapModalProps) => {
  const [loading, setLoading] = useState(false);
  const [sellToken, setSellToken] = useState<"MyUSD" | "ETH">("MyUSD");
  const [sellValue, setSellValue] = useState("");
  const [buyValue, setBuyValue] = useState("");

  const { data: stablecoinDEXContract } = useDeployedContractInfo({
    contractName: "DEX",
  });

  const { writeContractAsync: writeDEXContract } = useScaffoldWriteContract({
    contractName: "DEX",
  });

  const { writeContractAsync: writeMyUSDContract } = useScaffoldWriteContract({
    contractName: "MyUSD",
  });

  const handleChangeSellToken = () => {
    setSellToken(sellToken === "MyUSD" ? "ETH" : "MyUSD");
    setSellValue("");
    setBuyValue("");
  };

  const ethToToken = (ethAmount: string): string => {
    const tokenAmount = Number(ethAmount) * Number(ETHprice);
    return tokenAmount.toFixed(8);
  };

  const tokenToETH = (tokenAmount: string): string => {
    const ethAmount = Number(tokenAmount) / Number(ETHprice);
    return ethAmount.toFixed(8);
  };

  const handleChangeInput = (isSell: boolean, newValue: string) => {
    if (newValue === "") {
      setSellValue("");
      setBuyValue("");
      return;
    }
    if (isSell) {
      setSellValue(newValue);
      const tokenAmount = sellToken === "ETH" ? ethToToken(newValue) : tokenToETH(newValue);
      setBuyValue(tokenAmount);
    } else {
      setBuyValue(newValue);
      const ethAmount = sellToken === "MyUSD" ? ethToToken(newValue) : tokenToETH(newValue);
      setSellValue(ethAmount);
    }
  };

  const handleSwap = async () => {
    setLoading(true);
    if (sellToken === "MyUSD") {
      try {
        await writeMyUSDContract({
          functionName: "approve",
          args: [stablecoinDEXContract?.address, parseEther(sellValue)],
        });
        await writeDEXContract({
          functionName: "swap",
          args: [parseEther(sellValue)],
        });

        setSellValue("");
        setBuyValue("");
      } catch (error) {
        console.error("Error sending MyUSD:", error);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await writeDEXContract({
          functionName: "swap",
          args: [parseEther(sellValue)],
          value: parseEther(sellValue as `${number}`),
        });

        setBuyValue("");
        setSellValue("");
      } catch (error) {
        console.error("Error minting MyUSD:", error);
      } finally {
        setLoading(false);
      }
    }
  };
  return (
    <div>
      <input type="checkbox" id={`${modalId}`} className="modal-toggle" />
      <label htmlFor={`${modalId}`} className="modal cursor-pointer">
        <label className="modal-box relative">
          {/* dummy input to capture event onclick on modal box */}
          <input className="h-0 w-0 absolute top-0 left-0" />
          <h3 className="text-xl font-bold mb-3">Simple Swap</h3>
          <div className="absolute top-3 right-3 flex items-center space-x-2">
            <TooltipInfo top={0} right={0} infoText={`Here you can swap ${tokenName} for ETH and vice versa`} />
            <label htmlFor={`${modalId}`} className="btn btn-ghost btn-sm btn-circle">
              ✕
            </label>
          </div>
          <div className="space-y-3">
            <div className="flex space-x-4">
              <div className="flex flex-col">
                <span className="text-sm font-bold pl-3">Available:</span>
                <div className="flex">
                  <span className="text-sm pl-3">
                    {tokenBalance} {tokenName}
                  </span>
                  <Balance address={connectedAddress as Address} className="min-h-0 h-auto" />
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <div className="flex full-width flex-row">
                <div className="basis-10/12">
                  <IntegerInput
                    value={sellValue}
                    onChange={newValue => {
                      handleChangeInput(true, newValue);
                    }}
                    placeholder={`Sell ${sellToken}`}
                    disableMultiplyBy1e18
                  />
                </div>
                <span className="basis-2/12 flex justify-center items-center text-md">
                  {sellToken === "MyUSD" ? "MyUSD" : "ETH"}
                </span>
              </div>
              <div className="flex justify-center">
                <button className="btn btn-circle btn-sm" onClick={handleChangeSellToken}>
                  <ArrowDownIcon className="h-4 w-4 my-0" />
                </button>
              </div>
              <div className="flex full-width flex-row">
                <div className="basis-10/12">
                  <IntegerInput
                    value={buyValue}
                    onChange={newValue => {
                      handleChangeInput(false, newValue);
                    }}
                    placeholder={`Buy ${sellToken === "MyUSD" ? "ETH" : "MyUSD"}`}
                    disableMultiplyBy1e18
                  />
                </div>
                <span className="basis-2/12 flex justify-center items-center text-md">
                  {sellToken === "MyUSD" ? "ETH" : "MyUSD"}
                </span>
              </div>
              <button className="h-10 btn btn-primary btn-sm px-2 rounded-full" onClick={handleSwap} disabled={loading}>
                {!loading ? (
                  <ArrowsRightLeftIcon className="h-6 w-6" />
                ) : (
                  <span className="loading loading-spinner loading-sm"></span>
                )}
                <span>Swap</span>
              </button>
            </div>
          </div>
        </label>
      </label>
    </div>
  );
};
