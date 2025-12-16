"use client";

import { ContributeContractInteraction } from "./_components";
import type { NextPage } from "next";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

const CrowdFundPage: NextPage = () => {
  const { data: crowdFundContract } = useDeployedContractInfo({ contractName: "CrowdFund" });
  return <ContributeContractInteraction key={crowdFundContract?.address} address={crowdFundContract?.address} />;
};

export default CrowdFundPage;
