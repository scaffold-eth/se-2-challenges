import { utils } from "ethers";
import humanizeDuration from "humanize-duration";
import { Address } from "wagmi";
import { useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { Voucher } from "~~/pages/streamer";

type CashOutVoucherButtonProps = {
  clientAddress: Address;
  challenged: Address[];
  closed: Address[];
  voucher: Voucher;
};

export const CashOutVoucherButton = ({ clientAddress, challenged, closed, voucher }: CashOutVoucherButtonProps) => {
  const { data: timeLeft } = useScaffoldContractRead({
    contractName: "Streamer",
    functionName: "timeLeft",
    args: [clientAddress],
    watch: true,
  });

  const { writeAsync } = useScaffoldContractWrite({
    contractName: "Streamer",
    functionName: "withdrawEarnings",
    args: [{ ...voucher, sig: utils.splitSignature(voucher.signature) as any }],
  });

  const isButtonDisabled =
    closed.includes(clientAddress) || (challenged.includes(clientAddress) && !timeLeft?.toNumber());

  return (
    <div className="w-full flex flex-col items-center">
      <div className="h-8 pt-2">
        {challenged.includes(clientAddress) && (
          <>
            <span>Time left:</span> {timeLeft && humanizeDuration(timeLeft.toNumber() * 1000)}
          </>
        )}
      </div>
      <button
        className={`mt-3 btn btn-primary${challenged.includes(clientAddress) ? " btn-error" : ""}${
          isButtonDisabled ? " btn-disabled" : ""
        }`}
        disabled={isButtonDisabled}
        onClick={() => {
          writeAsync();
        }}
      >
        Cash out latest voucher
      </button>
    </div>
  );
};
