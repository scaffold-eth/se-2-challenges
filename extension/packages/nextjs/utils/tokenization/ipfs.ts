const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY;

export async function addToIPFS(body: unknown) {
  if (!PINATA_JWT) throw new Error("PINATA_JWT is not set, see .env.example");
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${PINATA_JWT}` },
    body: JSON.stringify({ pinataContent: body }),
  });
  if (!res.ok) throw new Error(`Pinata pin failed: ${res.status} ${await res.text()}`);
  const { IpfsHash } = await res.json();
  // ponytail: callers only use `path` (the CID)
  return { path: IpfsHash };
}

export async function getNFTMetadataFromIPFS(ipfsHash: string) {
  if (!PINATA_GATEWAY) throw new Error("NEXT_PUBLIC_PINATA_GATEWAY is not set, see .env.example");
  const res = await fetch(`https://${PINATA_GATEWAY}/ipfs/${ipfsHash}`);
  if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);
  return res.json();
}
