import { getNFTMetadataFromIPFS } from "~~/utils/tokenization/ipfs";

export async function POST(request: Request) {
  try {
    const { ipfsHash } = await request.json();
    const res = await getNFTMetadataFromIPFS(ipfsHash);
    return Response.json(res);
  } catch (error) {
    console.log("Error getting metadata from ipfs", error);
    const message = error instanceof Error ? error.message : "Error getting metadata from ipfs";
    return Response.json({ error: message }, { status: 500 });
  }
}
