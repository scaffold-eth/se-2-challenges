import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { corsHeaders } from "../utils/cors-headers";

export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  const body = await req.json();

  const key = `${body.address}_${body.chainId}`;
  const curVal = await kv.get(`tx:${key}`);

  await kv.set(`tx:${key}`, {
    ...(curVal || {}),
    [body.hash]: body,
  });

  return NextResponse.json({}, { headers: corsHeaders });
}
