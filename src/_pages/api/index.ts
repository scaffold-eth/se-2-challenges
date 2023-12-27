// Copy of api from /packages/backend-local.
// Used for non-local networks.
import type { NextApiRequest, NextApiResponse } from "next";
import { kv } from "@vercel/kv";

export default async function POST(req: NextApiRequest, res: NextApiResponse) {
  const key = `${req.body.address}_${req.body.chainId}`;
  const curVal = await kv.get(`tx:${key}`);

  await kv.set(`tx:${key}`, {
    ...(curVal || {}),
    [req.body.hash]: req.body,
  });

  return res.status(200).json(req.body);
}
