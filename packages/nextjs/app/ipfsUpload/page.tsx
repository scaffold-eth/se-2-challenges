"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { NextPage } from "next";
import { notification } from "~~/utils/scaffold-eth";
import { ipfsClient } from "~~/utils/simpleNFT";
import nftsMetadata from "~~/utils/simpleNFT/nftsMetadata";

const DynamicReactJson = dynamic(import("react-json-view"), { ssr: false });

const IpfsUpload: NextPage = () => {
  const [yourJSON, setYourJSON] = useState<object>(nftsMetadata[0]);
  const [loading, setLoading] = useState(false);
  const [uploadedIpfsPath, setUploadedIpfsPath] = useState("");

  const handleIpfsUpload = async () => {
    setLoading(true);
    const notificationId = notification.loading("Uploading to IPFS...");
    try {
      const uploadedItem = await ipfsClient.add(JSON.stringify(yourJSON));
      notification.remove(notificationId);
      notification.success("Uploaded to IPFS");

      setUploadedIpfsPath(uploadedItem.path);
    } catch (error) {
      notification.remove(notificationId);
      notification.error("Error uploading to IPFS");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <h1 className="text-center mb-4">
          <span className="block text-4xl font-bold">Upload to IPFS</span>
        </h1>
        <DynamicReactJson
          style={{ padding: "1rem", borderRadius: "0.75rem" }}
          src={yourJSON}
          theme="solarized"
          enableClipboard={false}
          onEdit={edit => {
            setYourJSON(edit.updated_src);
          }}
          onAdd={add => {
            setYourJSON(add.updated_src);
          }}
          onDelete={del => {
            setYourJSON(del.updated_src);
          }}
        />
        <button
          className={`btn btn-secondary mt-4 ${loading ? "loading" : ""}`}
          disabled={loading}
          onClick={handleIpfsUpload}
        >
          Upload to IPFS
        </button>
        {uploadedIpfsPath && (
          <div className="mt-4">
            <a href={`https://ipfs.io/ipfs/${uploadedIpfsPath}`} target="_blank" rel="noreferrer">
              {`https://ipfs.io/ipfs/${uploadedIpfsPath}`}
            </a>
          </div>
        )}
      </div>
    </>
  );
};

export default IpfsUpload;
