import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { JSONFileSyncPreset } from "lowdb/node";
import * as fs from "fs";
import * as https from "https";

dotenv.config();

type Transaction = {
  [key: string]: any;
};

type DataSchema = {
  transactions: { [key: string]: Transaction };
};

const app = express();

const db = JSONFileSyncPreset<DataSchema>("db.json", { transactions: {} });

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  console.log("Get /");
  res.status(200).send("Multisig backend is live!");
});

app.get("/:key", async (req, res) => {
  const { key } = req.params;
  console.log("Get /", key);
  await db.read();
  res.status(200).send(db.data.transactions[key] || {});
});

app.post("/", async (req, res) => {
  res.send(req.body);
  const key = `${req.body.address}_${req.body.chainId}`;

  await db.read();
  db.data.transactions[key] ||= {};
  db.data.transactions[key][req.body.hash] = req.body;
  await db.write();
});

const PORT = process.env.PORT || 49832;

if (fs.existsSync("server.key") && fs.existsSync("server.cert")) {
  https
    .createServer(
      {
        key: fs.readFileSync("server.key"),
        cert: fs.readFileSync("server.cert"),
      },
      app
    )
    .listen(PORT, () => {
      console.log("HTTPS Listening on port:", PORT);
    });
} else {
  app.listen(PORT, function () {
    console.log("HTTP Listening on port:", PORT);
  });
}
