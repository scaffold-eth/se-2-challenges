import { getNFTMetadataFromIPFS } from "~~/utils/simpleNFT/ipfs";

export async function POST(request: Request) {
  const { ipfsHash } = await request.json();

  const res = await getNFTMetadataFromIPFS(ipfsHash);

  return Response.json(res);
}
