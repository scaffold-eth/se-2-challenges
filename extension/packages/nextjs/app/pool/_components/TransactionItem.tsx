import { type FC } from "react";
import { Address, BlockieAvatar } from "../../../components/scaffold-eth";
import { Abi, DecodeFunctionDataReturnType, decodeFunctionData, formatEther } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { TransactionData } from "~~/app/create/page";
import {
  useDeployedContractInfo,
  useScaffoldContract,
  useScaffoldReadContract,
  useTransactor,
} from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getPoolServerUrl } from "~~/utils/getPoolServerUrl";
import { notification } from "~~/utils/scaffold-eth";

type TransactionItemProps = { tx: TransactionData; completed: boolean; outdated: boolean };

export const TransactionItem: FC<TransactionItemProps> = ({ tx, completed, outdated }) => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const transactor = useTransactor();
  const { targetNetwork } = useTargetNetwork();
  const poolServerUrl = getPoolServerUrl(targetNetwork.id);

  const { data: signaturesRequired } = useScaffoldReadContract({
    contractName: "MetaMultiSigWallet",
    functionName: "signaturesRequired",
  });

  const { data: nonce } = useScaffoldReadContract({
    contractName: "MetaMultiSigWallet",
    functionName: "nonce",
  });

  const { data: metaMultiSigWallet } = useScaffoldContract({
    contractName: "MetaMultiSigWallet",
    walletClient,
  });

  const { data: contractInfo } = useDeployedContractInfo("MetaMultiSigWallet");

  const txnData =
    contractInfo?.abi && tx.data
      ? decodeFunctionData({ abi: contractInfo.abi as Abi, data: tx.data })
      : ({} as DecodeFunctionDataReturnType);

  const hasSigned = tx.signers.indexOf(address as string) >= 0;
  const hasEnoughSignatures = signaturesRequired ? tx.signatures.length >= Number(signaturesRequired) : false;

  const getSortedSigList = async (allSigs: `0x${string}`[], newHash: `0x${string}`) => {
    const sigList = [];
    // eslint-disable-next-line no-restricted-syntax, guard-for-in
    for (const s in allSigs) {
      const recover = (await metaMultiSigWallet?.read.recover([newHash, allSigs[s]])) as `0x${string}`;

      sigList.push({ signature: allSigs[s], signer: recover });
    }

    sigList.sort((a, b) => {
      return BigInt(a.signer) > BigInt(b.signer) ? 1 : -1;
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
      <input type="checkbox" id={`label-${tx.hash}`} className="modal-toggle" />
      <div className="modal" role="dialog">
        <div className="modal-box">
          <div className="flex flex-col">
            <div className="flex gap-2">
              <div className="font-bold">Function Signature:</div>
              {txnData.functionName || "transferFunds"}
            </div>
            <div className="flex flex-col gap-2 mt-6">
              {txnData.args ? (
                <>
                  <h4 className="font-bold">Arguments</h4>
                  <div className="flex gap-4">
                    Updated signer: <Address address={String(txnData.args?.[0])} />
                  </div>
                  <div>Updated signatures required: {String(txnData.args?.[1])}</div>
                </>
              ) : (
                <>
                  <div className="flex gap-4">
                    Transfer to: <Address address={tx.to} />
                  </div>
                  <div>Amount: {formatEther(BigInt(tx.amount))} Ξ </div>
                </>
              )}
            </div>
            <div className="mt-4">
              <div className="font-bold">Sig hash</div>{" "}
              <div className="flex gap-1 mt-2">
                <BlockieAvatar size={20} address={tx.hash} /> {tx.hash.slice(0, 7)}
              </div>
            </div>
            <div className="modal-action">
              <label htmlFor={`label-${tx.hash}`} className="btn btn-sm">
                Close!
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col pb-2 border-b border-secondary last:border-b-0">
        <div className="flex gap-4 justify-between">
          <div className="font-bold"># {String(tx.nonce)}</div>
          <div className="flex gap-1 font-bold">
            <BlockieAvatar size={20} address={tx.hash} /> {tx.hash.slice(0, 7)}
          </div>

          <Address address={tx.to} />

          <div>{formatEther(BigInt(tx.amount))} Ξ</div>

          {String(signaturesRequired) && (
            <span>
              {tx.signatures.length}/{String(tx.requiredApprovals)} {hasSigned ? "✅" : ""}
            </span>
          )}

          {completed ? (
            <div className="font-bold">Completed</div>
          ) : outdated ? (
            <div className="font-bold">Outdated</div>
          ) : (
            <>
              <div title={hasSigned ? "You have already Signed this transaction" : ""}>
                <button
                  className="btn btn-xs btn-primary"
                  disabled={hasSigned}
                  title={!hasEnoughSignatures ? "Not enough signers to Execute" : ""}
                  onClick={async () => {
                    try {
                      if (!walletClient) {
                        return;
                      }

                      const newHash = (await metaMultiSigWallet?.read.getTransactionHash([
                        nonce as bigint,
                        tx.to,
                        BigInt(tx.amount),
                        tx.data,
                      ])) as `0x${string}`;

                      const signature = await walletClient.signMessage({
                        message: { raw: newHash },
                      });

                      const signer = await metaMultiSigWallet?.read.recover([newHash, signature]);

                      const isOwner = await metaMultiSigWallet?.read.isOwner([signer as string]);

                      if (isOwner) {
                        const [finalSigList, finalSigners] = await getSortedSigList(
                          [...tx.signatures, signature],
                          newHash,
                        );

                        await fetch(poolServerUrl, {
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
                      } else {
                        notification.info("Only owners can sign transactions");
                      }
                    } catch (e) {
                      notification.error("Error signing transaction");
                      console.log(e);
                    }
                  }}
                >
                  Sign
                </button>
              </div>

              <div title={!hasEnoughSignatures ? "Not enough signers to Execute" : ""}>
                <button
                  className="btn btn-xs btn-primary"
                  disabled={!hasEnoughSignatures}
                  onClick={async () => {
                    try {
                      if (!contractInfo || !metaMultiSigWallet) {
                        console.log("No contract info");
                        return;
                      }
                      const newHash = (await metaMultiSigWallet.read.getTransactionHash([
                        nonce as bigint,
                        tx.to,
                        BigInt(tx.amount),
                        tx.data,
                      ])) as `0x${string}`;

                      const [finalSigList] = await getSortedSigList(tx.signatures, newHash);

                      await transactor(() =>
                        metaMultiSigWallet.write.executeTransaction([tx.to, BigInt(tx.amount), tx.data, finalSigList]),
                      );
                    } catch (e) {
                      notification.error("Error executing transaction");
                      console.log(e);
                    }
                  }}
                >
                  Exec
                </button>
              </div>
            </>
          )}

          <label htmlFor={`label-${tx.hash}`} className="btn btn-primary btn-xs">
            ...
          </label>
        </div>

        <div className="flex justify-between text-xs gap-4 mt-2">
          <div>Function name: {txnData.functionName || "transferFunds"}</div>

          <div className="flex gap-1 items-center">
            Addressed to: <Address address={txnData.args?.[0] ? String(txnData.args?.[0]) : tx.to} size="xs" />
          </div>
        </div>
      </div>
    </>
  );
};
