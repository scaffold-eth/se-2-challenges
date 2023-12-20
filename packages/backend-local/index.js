const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const transactions = {};

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/:key", function (req, res) {
  const { key } = req.params;
  console.log("Get /", key);
  res.status(200).send(transactions[key] || {});
});

app.post("/", function (req, res) {
  console.log("Post /", req.body); // your JSON
  res.send(req.body); // echo the result back
  const key = `${req.body.address}_${req.body.chainId}`;
  console.log("key:", key);
  if (!transactions[key]) {
    transactions[key] = {};
  }
  transactions[key][req.body.hash] = req.body;
  console.log("transactions", transactions);
});

const PORT = process.env.PORT || 49832;
const server = app.listen(PORT, function () {
  console.log("HTTP Listening on port:", server.address().port);
});
