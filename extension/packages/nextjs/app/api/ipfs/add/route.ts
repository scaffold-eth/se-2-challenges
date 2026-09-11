"use server";

import { addToIPFS } from "~~/utils/tokenization/ipfs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await addToIPFS(body);
    return Response.json(res);
  } catch (error) {
    console.log("Error adding to ipfs", error);
    const message = error instanceof Error ? error.message : "Error adding to ipfs";
    return Response.json({ error: message }, { status: 500 });
  }
}
