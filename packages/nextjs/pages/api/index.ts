import type { NextApiRequest, NextApiResponse } from "next";
import { transactions } from "~~/constants";

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
  } else {
    res.status(500).send("Something went wrong");
  }
}
