var express = require("express");
var fs = require("fs");
const https = require("https");
var cors = require("cors");
var bodyParser = require("body-parser");

var app = express();

let transactions = {};

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/:key", function (req, res) {
  const key = req.params.key;
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

var server = app.listen(49832, function () {
  console.log("HTTP Listening on port:", server.address().port);
});
