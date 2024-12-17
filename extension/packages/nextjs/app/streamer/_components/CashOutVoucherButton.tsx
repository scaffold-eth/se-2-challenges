import { Voucher } from "./Guru";
import humanizeDuration from "humanize-duration";
import { Address, hexToSignature } from "viem";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

type CashOutVoucherButtonProps = {
  clientAddress: Address;
  challenged: Address[];
  closed: Address[];
  voucher: Voucher;
};

export const CashOutVoucherButton = ({ clientAddress, challenged, closed, voucher }: CashOutVoucherButtonProps) => {
  const { writeContractAsync } = useScaffoldWriteContract("Streamer");

  const { data: timeLeft } = useScaffoldReadContract({
    contractName: "Streamer",
    functionName: "timeLeft",
    args: [clientAddress],
    watch: true,
  });

  const isButtonDisabled =
    !voucher || closed.includes(clientAddress) || (challenged.includes(clientAddress) && !timeLeft);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="h-8 pt-2">
        {challenged.includes(clientAddress) &&
          (!!timeLeft ? (
            <>
              <span>Time left:</span> {timeLeft && humanizeDuration(Number(timeLeft) * 1000)}
            </>
          ) : (
            <>Challenged. Cash out timed out</>
          ))}
      </div>
      <button
        className={`mt-3 btn btn-primary${challenged.includes(clientAddress) ? " btn-error" : ""}${
          isButtonDisabled ? " btn-disabled" : ""
        }`}
        disabled={isButtonDisabled}
        onClick={async () => {
          try {
            await writeContractAsync({
              functionName: "withdrawEarnings",
              // TODO: change to parseSignature when updating viem
              args: [{ ...voucher, sig: voucher?.signature ? (hexToSignature(voucher.signature) as any) : undefined }],
            });
          } catch (err) {
            console.error("Error calling withdrawEarnings function");
          }
        }}
      >
        Cash out latest voucher
      </button>
    </div>
  );
};
