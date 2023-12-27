import { corsHeaders } from "@/app/utils/cors-headers";
import { kv } from "@vercel/kv";

// import { NextApiRequest, NextApiResponse } from "next";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { key: string } }
) {
  const { key } = params;
  const tx = await kv.get(`tx:${key}`);

  return NextResponse.json({ ...(tx || {}) }, { headers: corsHeaders });
}
