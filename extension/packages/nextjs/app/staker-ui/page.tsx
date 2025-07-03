"use client";

import { StakeContractInteraction } from "./_components";
import type { NextPage } from "next";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

const StakerUI: NextPage = () => {
  const { data: StakerContract } = useDeployedContractInfo({ contractName: "Staker" });
  return <StakeContractInteraction key={StakerContract?.address} address={StakerContract?.address} />;
};

export default StakerUI;
