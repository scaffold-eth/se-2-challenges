import { utils } from "ethers";
import humanizeDuration from "humanize-duration";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { MetaHeader } from "~~/components/MetaHeader";
import { Address } from "~~/components/scaffold-eth";
import { ETHToPrice } from "~~/components/stake";
import {
  useAccountBalance,
  useDeployedContractInfo,
  useScaffoldContractRead,
  useScaffoldContractWrite,
} from "~~/hooks/scaffold-eth";
import { getTargetNetwork } from "~~/utils/scaffold-eth";

const StakerUI: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { data: StakerContract } = useDeployedContractInfo("Staker");
  const { balance: stakerContractBalance } = useAccountBalance(StakerContract?.address);
  const configuredNetwork = getTargetNetwork();

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
      <div className="flex items-center flex-col flex-grow w-full px-4">
        <div className="flex flex-col items-center space-y-8 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-24 w-full max-w-md">
          <div className="flex flex-col w-full items-center">
            <p className="block text-2xl mt-0 mb-2 font-semibold">Staker Contract</p>
            <Address address={StakerContract?.address} size="xl" />
          </div>
          <div className="flex items-start justify-around w-full">
            <div className="flex flex-col items-center">
              <p className="block text-xl mt-0 mb-1 font-semibold">Time Left</p>
              <span>{timeLeft ? `${humanizeDuration(timeLeft.toNumber() * 1000)} left` : 0}</span>
            </div>
            <div className="flex flex-col items-center">
              <p className="block text-xl mt-0 mb-1 font-semibold">You Staked</p>
              <span>
                {myStake ? utils.formatEther(myStake.toString()) : 0} {configuredNetwork.nativeCurrency.symbol}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center shrink-0 w-full">
            <p className="block text-xl mt-0 mb-1 font-semibold">Total Staked</p>
            <div className="flex space-x-2">
              {<ETHToPrice value={stakerContractBalance ? stakerContractBalance.toString() : undefined} />}
              <span>/</span>
              {<ETHToPrice value={threshold && utils.formatEther(threshold)} />}
            </div>
          </div>
          <div className="flex flex-col space-y-5">
            <div className="flex space-x-7">
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
