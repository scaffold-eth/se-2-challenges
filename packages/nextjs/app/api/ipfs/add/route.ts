import { ipfsClient } from "~~/utils/simpleNFT/ipfs";

export async function POST(request: Request) {
  const body = await request.json();

  const res = await ipfsClient.add(JSON.stringify(body));

  return Response.json(res);
}
