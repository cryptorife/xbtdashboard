const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const logger = require("../winston")(module);
const api = require("./routes/api");
const version = require("../package.json").version;

require("dotenv").config();
const API_PORT = process.env.API_PORT;

const app = express();
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/api", api);

app.use(express.static(path.join(__dirname, "../build")));
app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "../build", "index.html"));
});

// launch our backend into a port
app.listen(API_PORT, () =>
  logger.info(`xbtdashboard v${version} is listening on port ${API_PORT}`)
);

process.on("SIGINT", () => {
  process.exit(0);
});
