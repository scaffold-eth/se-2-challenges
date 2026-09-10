// IPFS pinning goes through the SpeedRunEthereum proxy, so this challenge needs no IPFS credentials.
const IPFS_API_URL = "https://speedrunethereum.com/api/ipfs";

const request = async (path: string, init?: RequestInit) => {
  const res = await fetch(`${IPFS_API_URL}${path}`, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `IPFS request failed: ${res.status}`);
  return data;
};

export async function addToIPFS(metadata: object) {
  const { cid } = await request("/pin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  // Callers read the CID from `path`
  return { path: cid as string };
}

export async function getNFTMetadataFromIPFS(ipfsHash: string) {
  return request(`/${ipfsHash}`);
}
