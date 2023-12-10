import { type FC, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { DEFAULT_TX_DATA, METHODS, Method, PredefinedTxData } from "./owners";
import { useIsMounted, useLocalStorage } from "usehooks-ts";
import { Address, parseEther } from "viem";
import { useChainId, useWalletClient } from "wagmi";
import * as chains from "wagmi/chains";
import { AddressInput, EtherInput, InputBase } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldContract, useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import scaffoldConfig from "~~/scaffold.config";
import { notification } from "~~/utils/scaffold-eth";

export type TransactionData = {
  chainId: number;
  address: Address;
  nonce: bigint;
  to: string;
  amount: string;
  data: `0x${string}`;
  hash: string;
  signatures: `0x${string}`[];
  signers: Address[];
  validSignatures?: { signer: Address; signature: Address }[];
  requiredApprovals: bigint;
};

export const POOL_SERVER_URL = scaffoldConfig.targetNetwork === chains.hardhat ? "http://localhost:49832/" : "/api/";

const CreatePage: FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();

  const [ethValue, setEthValue] = useState("");
  const { data: contractInfo } = useDeployedContractInfo("MetaMultiSigWallet");

  const [predefinedTxData, setPredefinedTxData] = useLocalStorage<PredefinedTxData>("predefined-tx-data", {
    methodName: "transferFunds",
    signer: "",
    newSignaturesNumber: "",
    amount: "0",
  });

  const { data: nonce } = useScaffoldContractRead({
    contractName: "MetaMultiSigWallet",
    functionName: "nonce",
  });

  const { data: signaturesRequired } = useScaffoldContractRead({
    contractName: "MetaMultiSigWallet",
    functionName: "signaturesRequired",
  });

  const txTo = predefinedTxData.methodName === "transferFunds" ? predefinedTxData.signer : contractInfo?.address;

  const { data: metaMultiSigWallet } = useScaffoldContract({
    contractName: "MetaMultiSigWallet",
  });

  const handleCreate = async () => {
    if (!walletClient) {
      console.log("No wallet client!");
      return;
    }

    const newHash = (await metaMultiSigWallet?.read.getTransactionHash([
      nonce as bigint,
      String(txTo),
      BigInt(predefinedTxData.amount as string),
      predefinedTxData.callData as `0x${string}`,
    ])) as `0x${string}`;

    const signature = await walletClient.signMessage({
      message: { raw: newHash },
    });

    const recover = (await metaMultiSigWallet?.read.recover([newHash, signature])) as Address;

    const isOwner = await metaMultiSigWallet?.read.isOwner([recover]);

    if (isOwner) {
      if (!contractInfo?.address || !predefinedTxData.amount || !txTo) {
        return;
      }

      const txData: TransactionData = {
        chainId: chainId,
        address: contractInfo.address,
        nonce: nonce || 0n,
        to: txTo,
        amount: predefinedTxData.amount,
        data: predefinedTxData.callData as `0x${string}`,
        hash: newHash,
        signatures: [signature],
        signers: [recover],
        requiredApprovals: signaturesRequired || 0n,
      };

      await fetch(POOL_SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          txData,
          // stringifying bigint
          (key, value) => (typeof value === "bigint" ? value.toString() : value),
        ),
      });

      // TODO: Set hash or error to result and show it or not?
      //   setResult(res.data.hash);

      setPredefinedTxData(DEFAULT_TX_DATA);

      setTimeout(() => {
        router.push("/pool");
      }, 777);
    } else {
      notification.info("Only owners can propose transactions");
    }
  };

  useEffect(() => {
    if (predefinedTxData && !predefinedTxData.callData && predefinedTxData.methodName !== "transferFunds") {
      setPredefinedTxData({
        ...predefinedTxData,
        methodName: "transferFunds",
        callData: "",
      });
    }
  }, [predefinedTxData, setPredefinedTxData]);

  return isMounted() ? (
    <div className="flex items-center flex-col flex-grow w-full max-w-lg">
      <div className="flex flex-col bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl w-full p-6">
        <div>
          <label className="label">
            <span className="label-text">Nonce</span>
          </label>
          <InputBase
            disabled
            value={`# ${nonce}`}
            placeholder={"loading..."}
            onChange={() => {
              null;
            }}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="mt-6 w-full">
            <label className="label">
              <span className="label-text">Select method</span>
            </label>
            <select
              className="select select-bordered select-sm w-full bg-base-200 text-accent font-medium"
              value={predefinedTxData.methodName}
              onChange={e =>
                setPredefinedTxData({
                  ...predefinedTxData,
                  methodName: e.target.value as Method,
                  callData: "" as `0x${string}`,
                })
              }
            >
              {METHODS.map(method => (
                <option key={method} value={method} disabled={method !== "transferFunds"}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <AddressInput
            placeholder="Signer address"
            value={predefinedTxData.signer}
            onChange={signer => setPredefinedTxData({ ...predefinedTxData, signer: signer })}
          />

          {predefinedTxData.methodName === "transferFunds" && (
            <EtherInput
              value={ethValue}
              onChange={val => {
                setPredefinedTxData({ ...predefinedTxData, amount: String(parseEther(val)) });
                setEthValue(val);
              }}
            />
          )}

          <InputBase
            value={predefinedTxData.callData || ""}
            placeholder={"Calldata"}
            onChange={() => {
              null;
            }}
            disabled
          />

          <button className="btn btn-secondary btn-sm" disabled={!walletClient} onClick={handleCreate}>
            Create
          </button>
        </div>
      </div>
    </div>
  ) : null;
};

export default CreatePage;
