// Copy of api from /packages/backend-local.
// Used for non-local networks.
import type { NextApiRequest, NextApiResponse } from "next";

const transactions: { [key: string]: any } = {};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const key = `${req.body.address}_${req.body.chainId}`;

    console.log("key:", key);
    if (!transactions[key]) {
      transactions[key] = {};
    }
    transactions[key][req.body.hash] = req.body;
    console.log("transactions", transactions);
    res.status(200).json(req.body);
  } else if (req.method === "GET") {
    const { key } = req.query;
    res.status(200).json(transactions[key as string] || {});
  } else {
    res.status(500).send("Something went wrong");
  }
}
