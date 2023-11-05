import type { NextApiRequest, NextApiResponse } from "next";
import { transactions } from "~~/constants";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { key } = req.query;
  res.status(200).json(transactions[key as string]);
}
