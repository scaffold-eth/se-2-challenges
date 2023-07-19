import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";
import { StakeContractInteraction } from "~~/components/stake";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

const StakerUI: NextPage = () => {
  const { data: StakerContract } = useDeployedContractInfo("Staker");
  return (
    <>
      <MetaHeader />
      <StakeContractInteraction key={StakerContract?.address} address={StakerContract?.address} />
    </>
  );
};

export default StakerUI;
