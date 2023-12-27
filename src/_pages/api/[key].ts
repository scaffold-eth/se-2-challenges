import { kv } from "@vercel/kv";

import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { query } = req;
  const { key } = query;

  const tx = await kv.get(`tx:${key}`);

  res.status(200).json({ ...(tx || {}) });
}
