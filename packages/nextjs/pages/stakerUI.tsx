import { utils } from "ethers";
import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";
import { Address } from "~~/components/scaffold-eth";
import {
  useAccountBalance,
  useDeployedContractInfo,
  useScaffoldContractRead,
  useScaffoldContractWrite,
  useScaffoldEventHistory,
} from "~~/hooks/scaffold-eth";

const StakerUI: NextPage = () => {
  const { data: StakerContract } = useDeployedContractInfo("Staker");

  const { writeAsync: stakeETH } = useScaffoldContractWrite({
    contractName: "Staker",
    functionName: "stake",
    value: "0.5",
  });

  const { data: threshold } = useScaffoldContractRead({
    contractName: "Staker",
    functionName: "threshold",
    watch: true,
  });

  const { balance: stakerContractBalance } = useAccountBalance(StakerContract?.address);

  const { data: stakeEvents } = useScaffoldEventHistory({
    contractName: "Staker",
    eventName: "Stake",
    fromBlock: 0,
  });
  return (
    <>
      <MetaHeader />
      <div className="flex items-center flex-col flex-grow pt-10 w-full">
        <div className="flex flex-col items-center space-y-8 bg-base-100 shadow-lg w-[28rem] shadow-secondary border-8 border-secondary rounded-xl p-6">
          <div className="flex flex-col">
            <p className="block text-2xl mt-0 mb-2 font-semibold">Staker Contract</p>
            <Address address={StakerContract?.address} size="xl" />
          </div>
          <div className="flex space-x-6">
            <div className="flex flex-col items-center">
              <p className="block text-xl mt-0 mb-1 font-semibold">Time Left</p>
              <span>30 seconds left</span>
            </div>
            <div className="flex flex-col items-center">
              <p className="block text-xl mt-0 mb-1 font-semibold">Total Staked</p>
              <span>
                {stakerContractBalance} / {threshold && utils.formatEther(threshold?.toString())}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <p className="block text-xl mt-0 mb-1 font-semibold">You Staked</p>
            <span>0.5000</span>
          </div>
          <div className="flex flex-col space-y-5">
            <div className="flex space-x-6">
              <button className="btn btn-primary">Stake</button>
              <button className="btn btn-primary">Withdraw</button>
            </div>
            <button className="btn btn-primary" onClick={() => stakeETH()}>
              🥩 Stake 0.5 ether!
            </button>
          </div>
        </div>
        <div className="px-5 mt-8">
          <h1 className="text-center mb-3">
            <span className="block text-2xl font-bold">All Staking Events</span>
          </h1>
        </div>
        <div className="overflow-x-auto shadow-lg">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th className="bg-primary">From</th>
                <th className="bg-primary">Value</th>
              </tr>
            </thead>
            <tbody>
              {!stakeEvents || stakeEvents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center">
                    No events found
                  </td>
                </tr>
              ) : (
                stakeEvents?.map((event, index) => {
                  return (
                    <tr key={index}>
                      <td>
                        <Address address={event.args.staker} />
                      </td>
                      <td>{event.args.value && utils.formatEther(event.args.value.toString())} ETH</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default StakerUI;
