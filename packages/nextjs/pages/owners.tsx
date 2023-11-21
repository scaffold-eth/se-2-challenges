import { type FC } from "react";
import { useRouter } from "next/router";
import { useIsMounted, useLocalStorage } from "usehooks-ts";
import { Abi, encodeFunctionData } from "viem";
import { Address, AddressInput, IntegerInput } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldContractRead, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

export type Method = "addSigner" | "removeSigner" | "transferFunds";
export const METHODS: Method[] = ["addSigner", "removeSigner", "transferFunds"];

export const OWNERS_METHODS = METHODS.filter(m => m !== "transferFunds");

export type PredefinedTxData = {
  methodName: Method;
  signer: string;
  newSignaturesNumber: string;
  to?: string;
  amount?: string;
  callData?: `0x${string}`;
};

const Owners: FC = () => {
  const isMounted = useIsMounted();

  const router = useRouter();

  const [predefinedTxData, setPredefinedTxData] = useLocalStorage<PredefinedTxData>("predefined-tx-data", {
    methodName: OWNERS_METHODS[0],
    signer: "",
    newSignaturesNumber: "",
  });

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

  return isMounted() ? (
    <div>
      <div>Signatures required: {String(signaturesRequired)}</div>

      <div className="mt-10">
        {ownerEventsHistory?.map((event, i) => (
          <div key={i} className="flex gap-8 justify-between">
            <Address address={event.args.owner} />
            <span>{event.args.added ? "Added 👍" : "Removed 👎"}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-4 form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text">Select method</span>
        </label>
        <select
          className="select select-bordered select-sm w-full max-w-xs"
          value={predefinedTxData.methodName}
          onChange={e => setPredefinedTxData({ ...predefinedTxData, methodName: e.target.value as Method })}
        >
          {OWNERS_METHODS.map(method => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>

        <AddressInput
          placeholder="Signer address"
          value={predefinedTxData.signer}
          onChange={s => setPredefinedTxData({ ...predefinedTxData, signer: s })}
        />

        <IntegerInput
          placeholder="New № of signatures required"
          value={predefinedTxData.newSignaturesNumber}
          onChange={s => setPredefinedTxData({ ...predefinedTxData, newSignaturesNumber: s as string })}
          hideSuffix
        />

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            // console.log("METHOD", setMethodName);
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
  ) : null;
};

export default Owners;
