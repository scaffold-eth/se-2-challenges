import { utils } from "ethers";
import humanizeDuration from "humanize-duration";
import { Address, useSigner } from "wagmi";
import { useScaffoldContract, useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import { Voucher } from "~~/pages/streamer";

type CashOutVoucherButtonProps = {
  clientAddress: Address;
  challenged: Address[];
  closed: Address[];
  voucher: Voucher;
};

export const CashOutVoucherButton = ({ clientAddress, challenged, closed, voucher }: CashOutVoucherButtonProps) => {
  const { data: userSigner } = useSigner();
  const { data: streamerContract } = useScaffoldContract({
    contractName: "Streamer",
    signerOrProvider: userSigner || undefined,
  });

  const { data: timeLeft } = useScaffoldContractRead({
    contractName: "Streamer",
    functionName: "timeLeft",
    args: [clientAddress],
    watch: true,
  });

  const isButtonDisabled =
    !voucher || closed.includes(clientAddress) || (challenged.includes(clientAddress) && !timeLeft?.toNumber());

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
          streamerContract?.withdrawEarnings({ ...voucher, sig: utils.splitSignature(voucher.signature) as any });
        }}
      >
        Cash out latest voucher
      </button>
    </div>
  );
};
