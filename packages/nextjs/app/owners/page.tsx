"use client";

import { type FC, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsMounted, useLocalStorage } from "usehooks-ts";
import { Abi, encodeFunctionData } from "viem";
import { Address, AddressInput, IntegerInput } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldContractRead, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

export type Method = "addSigner" | "removeSigner" | "transferFunds";
export const METHODS: Method[] = ["addSigner", "removeSigner", "transferFunds"];
export const OWNERS_METHODS = METHODS.filter(m => m !== "transferFunds");

export const DEFAULT_TX_DATA = {
  methodName: OWNERS_METHODS[0],
  signer: "",
  newSignaturesNumber: "",
};

export type PredefinedTxData = {
  methodName: Method;
  signer: string;
  newSignaturesNumber: string;
  to?: string;
  amount?: string;
  callData?: `0x${string}` | "";
};

const Owners: FC = () => {
  const isMounted = useIsMounted();

  const router = useRouter();

  const [predefinedTxData, setPredefinedTxData] = useLocalStorage<PredefinedTxData>(
    "predefined-tx-data",
    DEFAULT_TX_DATA,
  );

  const { data: contractInfo } = useDeployedContractInfo("MetaMultiSigWallet");

  const { data: signaturesRequired } = useScaffoldContractRead({
    contractName: "MetaMultiSigWallet",
    functionName: "signaturesRequired",
  });

  const { data: ownerEventsHistory } = useScaffoldEventHistory({
    contractName: "MetaMultiSigWallet",
    eventName: "Owner",
    fromBlock: 0n,
  });

  useEffect(() => {
    if (predefinedTxData.methodName === "transferFunds") {
      setPredefinedTxData(DEFAULT_TX_DATA);
    }
  }, [predefinedTxData.methodName, setPredefinedTxData]);

  return isMounted() ? (
    <div className="flex flex-col flex-1 items-center my-20 gap-8">
      <div className="flex items-center flex-col flex-grow w-full max-w-lg">
        <div className="flex flex-col items-center bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 w-full">
          <div className="max-w-full">Signatures required: {String(signaturesRequired)}</div>

          <div className="mt-6 w-full space-y-3">
            {ownerEventsHistory?.map((event, i) => (
              <div key={i} className="flex justify-between">
                <Address address={event.args.owner} />
                <span>{event.args.added ? "Added 👍" : "Removed 👎"}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-4 form-control w-full">
            <div className="w-full">
              <label className="label">
                <span className="label-text">Select method</span>
              </label>
              <select
                className="select select-bordered select-sm w-full bg-base-200 text-accent font-medium"
                value={predefinedTxData.methodName}
                onChange={e =>
                  setPredefinedTxData({ ...predefinedTxData, methodName: e.target.value as Method, callData: "" })
                }
              >
                {OWNERS_METHODS.map(method => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <AddressInput
              placeholder="Signer address"
              value={predefinedTxData.signer}
              onChange={s => setPredefinedTxData({ ...predefinedTxData, signer: s })}
            />

            <IntegerInput
              placeholder="New № of signatures required"
              value={predefinedTxData.newSignaturesNumber}
              onChange={s => setPredefinedTxData({ ...predefinedTxData, newSignaturesNumber: s as string })}
              disableMultiplyBy1e18
            />

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const callData = encodeFunctionData({
                  abi: contractInfo?.abi as Abi,
                  functionName: predefinedTxData.methodName,
                  args: [predefinedTxData.signer, predefinedTxData.newSignaturesNumber],
                });

                setPredefinedTxData({
                  ...predefinedTxData,
                  callData,
                  amount: "0",
                  to: contractInfo?.address,
                });

                setTimeout(() => {
                  router.push("/create");
                }, 777);
              }}
            >
              Create Tx
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;
};

export default Owners;
