import { type FC, useState } from "react";
import { useRouter } from "next/router";
import { METHODS, Method, PredefinedTxData } from "./owners";
import { readContract } from "@wagmi/core";
import { useIsMounted, useLocalStorage } from "usehooks-ts";
import { Abi, Address, parseEther } from "viem";
import { useChainId, useWalletClient } from "wagmi";
import { AddressInput, EtherInput, InputBase } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldContractRead } from "~~/hooks/scaffold-eth";

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
};

export const POOL_SERVER_URL = "http://localhost:49832/";

const CreatePage: FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();

  const [ethValue, setEthValue] = useState("");
  const { data: contractInfo } = useDeployedContractInfo("MetaMultiSigWallet");

  const [predefinedTxData, setPredefinedTxData] = useLocalStorage<PredefinedTxData>("predefined-tx-data", {
    methodName: METHODS[0] as Method,
    signer: "",
    newSignaturesNumber: "",
    amount: "0",
  });

  const { data: nonce } = useScaffoldContractRead({
    contractName: "MetaMultiSigWallet",
    functionName: "nonce",
  });

  const handleCreate = async () => {
    if (!walletClient) {
      console.log("No wallet client!");
      return;
    }

    const newHash = (await readContract({
      address: contractInfo?.address as Address,
      abi: contractInfo?.abi as Abi,
      functionName: "getTransactionHash",
      args: [nonce, predefinedTxData.to, parseEther(ethValue), predefinedTxData.callData as `0x${string}`],
    })) as `0x${string}`;

    const signature = await walletClient.signMessage({
      message: { raw: newHash },
    });

    const recover = (await readContract({
      address: contractInfo?.address as Address,
      abi: contractInfo?.abi as Abi,
      functionName: "recover",
      args: [newHash, signature],
    })) as Address;

    const isOwner = await readContract({
      address: contractInfo?.address as Address,
      abi: contractInfo?.abi as Abi,
      functionName: "isOwner",
      args: [recover],
    });

    if (isOwner) {
      if (!contractInfo?.address || !predefinedTxData.to || !predefinedTxData.amount || !predefinedTxData.callData) {
        return;
      }

      const txData: TransactionData = {
        chainId: chainId,
        address: contractInfo.address,
        nonce: nonce || 0n,
        to: predefinedTxData.to,
        amount: predefinedTxData.amount,
        data: predefinedTxData.callData,
        hash: newHash,
        signatures: [signature],
        signers: [recover],
      };

      const res = await fetch(POOL_SERVER_URL, {
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

      setPredefinedTxData({
        ...predefinedTxData,
        to: "",
        amount: "",
        callData: "0x",
      });

      setTimeout(() => {
        router.push("/pool");
      }, 777);
    } else {
      console.log("ERROR, NOT OWNER.");
    }
  };

  return isMounted() ? (
    <div>
      <div className="mt-10 flex flex-col gap-4 form-control w-full max-w-xs">
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

        <label className="label">
          <span className="label-text">Select method</span>
        </label>
        <select
          className="select select-bordered select-sm w-full max-w-xs"
          value={predefinedTxData.methodName}
          onChange={e => setPredefinedTxData({ ...predefinedTxData, methodName: e.target.value as Method })}
          disabled={predefinedTxData.methodName !== "transferFunds"}
        >
          {METHODS.map(method => (
            <option key={method} value={method} disabled={method !== "transferFunds"}>
              {method}
            </option>
          ))}
        </select>

        <AddressInput
          placeholder="Signer address"
          value={predefinedTxData.signer}
          onChange={signer => setPredefinedTxData({ ...predefinedTxData, signer: signer })}
        />

        {predefinedTxData.methodName === "transferFunds" && (
          <EtherInput
            value={predefinedTxData.amount || ""}
            onChange={val => setPredefinedTxData({ ...predefinedTxData, amount: val })}
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
  ) : null;
};

export default CreatePage;
