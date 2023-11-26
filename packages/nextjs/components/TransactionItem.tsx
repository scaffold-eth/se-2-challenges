import { type FC } from "react";
import { Address, BlockieAvatar } from "./scaffold-eth";
import { readContract, writeContract } from "@wagmi/core";
import { Abi, Address as AddressType, decodeFunctionData, formatEther } from "viem";
import { DecodeFunctionDataReturnType } from "viem/_types/utils/abi/decodeFunctionData";
import { useAccount, useWalletClient } from "wagmi";
import { useDeployedContractInfo, useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import { POOL_SERVER_URL, TransactionData } from "~~/pages/create";

type TransactionItemProps = { tx: TransactionData };

export const TransactionItem: FC<TransactionItemProps> = ({ tx }) => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const { data: signaturesRequired } = useScaffoldContractRead({
    contractName: "MetaMultiSigWallet",
    functionName: "signaturesRequired",
  });

  const { data: nonce } = useScaffoldContractRead({
    contractName: "MetaMultiSigWallet",
    functionName: "nonce",
  });

  const { data: contractInfo } = useDeployedContractInfo("MetaMultiSigWallet");

  const txnData =
    contractInfo?.abi && tx.data
      ? decodeFunctionData({ abi: contractInfo.abi as Abi, data: tx.data })
      : ({} as DecodeFunctionDataReturnType);

  const hasSigned = tx.signers.indexOf(address as string) >= 0;
  const hasEnoughSignatures = signaturesRequired ? tx.signatures.length <= Number(signaturesRequired) : false;

  const getSortedSigList = async (allSigs: `0x${string}`[], newHash: `0x${string}`) => {
    const sigList = [];
    // eslint-disable-next-line no-restricted-syntax, guard-for-in
    for (const s in allSigs) {
      const recover = (await readContract({
        address: contractInfo?.address as AddressType,
        abi: contractInfo?.abi as Abi,
        functionName: "recover",
        args: [newHash, allSigs[s]],
      })) as `0x${string}`;

      sigList.push({ signature: allSigs[s], signer: recover });
    }

    sigList.sort((a, b) => {
      return BigInt(a.signer) - BigInt(b.signer) ? 1 : -1;
    });

    const finalSigList: `0x${string}`[] = [];
    const finalSigners: `0x${string}`[] = [];
    const used: Record<string, boolean> = {};
    // eslint-disable-next-line no-restricted-syntax, guard-for-in
    for (const s in sigList) {
      if (!used[sigList[s].signature]) {
        finalSigList.push(sigList[s].signature);
        finalSigners.push(sigList[s].signer);
      }
      used[sigList[s].signature] = true;
    }

    return [finalSigList, finalSigners];
  };

  return (
    <>
      <div className="flex flex-col">
        <div className="flex gap-4">
          <div className="font-bold"># {String(tx.nonce)}</div>
          <div className="flex gap-1 font-bold">
            <BlockieAvatar size={20} address={tx.hash} /> {tx.hash.slice(0, 7)}
          </div>

          <Address address={tx.to} />

          <div>{formatEther(BigInt(tx.amount))} Ξ</div>

          {String(signaturesRequired) && (
            <span>
              {tx.signatures.length}/{String(signaturesRequired)} {hasSigned ? "✅" : ""}
            </span>
          )}

          <button
            className="btn btn-xs btn-primary"
            onClick={async () => {
              if (!walletClient) {
                return;
              }

              const newHash = (await readContract({
                address: contractInfo?.address as AddressType,
                abi: contractInfo?.abi as Abi,
                functionName: "getTransactionHash",
                args: [nonce, tx.to, tx.amount, tx.data],
              })) as `0x${string}`;

              const signature = await walletClient.signMessage({
                message: { raw: newHash },
              });

              const signer = (await readContract({
                address: contractInfo?.address as AddressType,
                abi: contractInfo?.abi as Abi,
                functionName: "recover",
                args: [newHash, signature],
              })) as AddressType;

              const isOwner = await readContract({
                address: contractInfo?.address as AddressType,
                abi: contractInfo?.abi as Abi,
                functionName: "isOwner",
                args: [signer],
              });

              if (isOwner) {
                const [finalSigList, finalSigners] = await getSortedSigList([...tx.signatures, signature], newHash);

                await fetch(POOL_SERVER_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(
                    {
                      ...tx,
                      signatures: finalSigList,
                      signers: finalSigners,
                    },
                    // stringifying bigint
                    (key, value) => (typeof value === "bigint" ? value.toString() : value),
                  ),
                });
              }
            }}
          >
            Sign
          </button>

          <button
            className={`btn btn-xs ${hasEnoughSignatures ? "btn-primary" : "btn-secondary"}`}
            onClick={async () => {
              if (!contractInfo) {
                console.log("No contract info");
                return;
              }
              const newHash = (await readContract({
                address: contractInfo?.address as AddressType,
                abi: contractInfo?.abi as Abi,
                functionName: "getTransactionHash",
                args: [nonce, tx.to, tx.amount, tx.data],
              })) as `0x${string}`;

              const [finalSigList] = await getSortedSigList(tx.signatures, newHash);

              writeContract({
                address: contractInfo?.address,
                abi: contractInfo?.abi,
                functionName: "executeTransaction",
                args: [tx.to, BigInt(tx.amount), tx.data, finalSigList],
              });
            }}
          >
            Exec
          </button>

          <label htmlFor={`label-${tx.hash}`} className="btn btn-primary btn-xs">
            ...
          </label>
        </div>

        <div className="flex justify-between text-xs gap-4">
          <div>Function name: {txnData.functionName}</div>

          <div className="flex gap-1">
            Addressed to: <Address address={String(txnData.args?.[0])} size="xs" />
          </div>
        </div>
      </div>

      <input type="checkbox" id={`label-${tx.hash}`} className="modal-toggle" />
      <div className="modal" role="dialog">
        <div className="modal-box">
          <div className="flex flex-col">
            <div>Function Signature: {txnData.functionName}</div> {/* {txnInfo.signature} */}
            <h4 className="mt-6 font-bold">Arguments</h4>
            <div>
              Updated signer: <Address address={String(txnData.args?.[0] || "")} />
            </div>
            <div>Updated signatures required: {String(txnData.args?.[1]) || "0"}</div>
            <div className="flex gap-1">
              Sig hash: <BlockieAvatar size={20} address={tx.hash} /> {tx.hash.slice(0, 7)}
            </div>
            <div className="modal-action">
              <label htmlFor={`label-${tx.hash}`} className="btn btn-sm">
                Close!
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
