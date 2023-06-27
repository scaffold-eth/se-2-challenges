import { utils } from "ethers";
import humanizeDuration from "humanize-duration";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { MetaHeader } from "~~/components/MetaHeader";
import { Address } from "~~/components/scaffold-eth";
import {
  useAccountBalance,
  useDeployedContractInfo,
  useScaffoldContractRead,
  useScaffoldContractWrite,
} from "~~/hooks/scaffold-eth";

const StakerUI: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { data: StakerContract } = useDeployedContractInfo("Staker");
  const { balance: stakerContractBalance } = useAccountBalance(StakerContract?.address);

  // Contract Read Actions
  const { data: threshold } = useScaffoldContractRead({
    contractName: "Staker",
    functionName: "threshold",
  });
  const { data: timeLeft } = useScaffoldContractRead({
    contractName: "Staker",
    functionName: "timeLeft",
    watch: true,
  });
  const { data: myStake } = useScaffoldContractRead({
    contractName: "Staker",
    functionName: "balances",
    args: [connectedAddress],
    watch: true,
  });

  // Contract Write Actions
  const { writeAsync: stakeETH } = useScaffoldContractWrite({
    contractName: "Staker",
    functionName: "stake",
    value: "0.5",
  });
  const { writeAsync: execute } = useScaffoldContractWrite({
    contractName: "Staker",
    functionName: "execute",
  });
  const { writeAsync: withdrawETH } = useScaffoldContractWrite({
    contractName: "Staker",
    functionName: "withdraw",
  });

  return (
    <>
      <MetaHeader />
      <div className="flex items-center flex-col flex-grow w-full">
        <div className="flex flex-col items-center space-y-8 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-24">
          <div className="flex flex-col">
            <p className="block text-2xl mt-0 mb-2 font-semibold">Staker Contract</p>
            <Address address={StakerContract?.address} size="xl" />
          </div>
          <div className="flex space-x-6 items-start justify-center">
            <div className="flex flex-col items-center">
              <p className="block text-xl mt-0 mb-1 font-semibold">Time Left</p>
              <span>{timeLeft ? humanizeDuration((timeLeft as any).toNumber() * 1000) : 0} left</span>
            </div>
            <div className="flex flex-col items-center shrink-0">
              <p className="block text-xl mt-0 mb-1 font-semibold">Total Staked</p>
              <span>
                {stakerContractBalance} / {threshold && utils.formatEther(threshold?.toString())}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <p className="block text-xl mt-0 mb-1 font-semibold">You Staked</p>
            <span>{myStake && utils.formatEther(myStake.toString())}</span>
          </div>
          <div className="flex flex-col space-y-5">
            <div className="flex space-x-6">
              <button className="btn btn-primary" onClick={() => execute()}>
                Execute!
              </button>
              <button className="btn btn-primary" onClick={() => withdrawETH()}>
                Withdraw
              </button>
            </div>
            <button className="btn btn-primary" onClick={() => stakeETH()}>
              🥩 Stake 0.5 ether!
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StakerUI;
