import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";

const TokenVendor: NextPage = () => {
  return (
    <>
      <MetaHeader />
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">Content</div>
      </div>
    </>
  );
};

export default TokenVendor;
