import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { AddressInfo } from "net";

dotenv.config();

type Transaction = {
  // [TransactionData type from next app]. Didn't add it since not in use
  // and it should be updated when next type changes
  [key: string]: any;
};

const app = express();

const transactions: { [key: string]: Transaction } = {};

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/:key", async (req, res) => {
  const { key } = req.params;
  console.log("Get /", key);
  res.status(200).send(transactions[key] || {});
});

app.post("/", async (req, res) => {
  console.log("Post /", req.body);
  res.send(req.body);
  const key = `${req.body.address}_${req.body.chainId}`;
  console.log("key:", key);
  if (!transactions[key]) {
    transactions[key] = {};
  }
  transactions[key][req.body.hash] = req.body;
  console.log("transactions", transactions);
});

const PORT = process.env.PORT || 49832;
const server = app
  .listen(PORT, () => {
    console.log(
      "HTTP Listening on port:",
      (server.address() as AddressInfo).port
    );
  })
  .on("error", (error) => {
    console.error("Error occurred starting the server: ", error);
  });
