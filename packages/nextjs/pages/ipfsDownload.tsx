
import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";
import { useState } from "react";
import { getNFTMetadataFromIPFS } from "~~/utils/simpleNFT";
import dynamic from "next/dynamic";
import { notification } from "~~/utils/scaffold-eth";

const IpfsDownload: NextPage = () => {
  const [yourJSON, setYourJSON] = useState({})
  const [ipfsPath, setIpfsPath] = useState("")
  const [loading, setLoading] = useState(false)
  const DynamicReactJson = dynamic(import('react-json-view'), { ssr: false });

  const handleIpfsDownload = async () => {
    setLoading(true)
    const notificationId = notification.loading("Getting data from IPFS");
    try {
      const metaData = await getNFTMetadataFromIPFS(ipfsPath);
      notification.remove(notificationId);
      notification.success("Downloaded from IPFS");

      setYourJSON(metaData)
    } catch (error) {
      notification.remove(notificationId);
      notification.error("Error downloading from IPFS");
      console.log(error)
    } finally {
      setLoading(false)
    }

  }

  return (
    <>
      <MetaHeader />
      <div className="flex items-center flex-col flex-grow pt-10">
        <h1 className="text-center mb-4">
          <span className="block text-4xl font-bold">Download from IPFS</span>
        </h1>
        <div className={`flex border-2 border-accent/95 bg-base-200 rounded-full text-accent w-96`}>
          <input
            className="input input-ghost focus:outline-none focus:bg-transparent focus:text-secondary-content h-[2.2rem] min-h-[2.2rem] px-4 border w-full font-medium placeholder:text-accent/50 text-secondary-content/75"
            placeholder="IPFS CID"
            value={ipfsPath}
            onChange={(e) => setIpfsPath(e.target.value)}
            autoComplete="off"
          />
        </div>
        <button className={`btn btn-secondary my-6 ${loading ? "loading" : ""}`} disabled={loading} onClick={handleIpfsDownload}>Download from IPFS</button>
        <DynamicReactJson
          style={{ padding: "1rem", borderRadius: "0.75rem" }}
          src={yourJSON}
          theme="solarized"
          enableClipboard={false}
          onEdit={(edit) => {
            setYourJSON(edit.updated_src);
          }}
          onAdd={(add) => {
            setYourJSON(add.updated_src);
          }}
          onDelete={(del) => {
            setYourJSON(del.updated_src);
          }}
        />
      </div>
    </>
  );
};

export default IpfsDownload;
