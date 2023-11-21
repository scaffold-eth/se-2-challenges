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
  let key = req.params.key;
  console.log("Get /", key);
  res.status(200).send(transactions[key] || {});
});

app.post("/", function (request, response) {
  console.log("Post /", request.body); // your JSON
  response.send(request.body); // echo the result back
  const key = `${request.body.address}_${request.body.chainId}`;
  console.log("key:", key);
  if (!transactions[key]) {
    transactions[key] = {};
  }
  transactions[key][request.body.hash] = request.body;
  console.log("transactions", transactions);
});

var server = app.listen(49832, function () {
  console.log("HTTP Listening on port:", server.address().port);
});
