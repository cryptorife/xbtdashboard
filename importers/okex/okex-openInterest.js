const logger = require("../../server/winston")(module);
const axios = require("axios");
const { InfluxDB, Point, HttpError } = require("@influxdata/influxdb-client");
const { url, bucket, token, org } = require("./env");

const writeApi = new InfluxDB({ url, token }).getWriteApi(org, bucket, "ms");

const main = async () => {
  try {
    let endp = "https://aws.okex.com";
    let okex = await axios.get(
      `${endp}/api/swap/v3/instruments/BTC-USD-SWAP/open_interest`
    );
    if (!okex) throw "Unable to fetch okex open interest";
    const p = new Point(`openInterest`)
      .floatField("openInterest", parseFloat(okex.data.amount))
      .timestamp(new Date(okex.data.timestamp));
    writeApi.writePoint(p);
    writeApi
      .close()
      .then(() => {
        logger.info("All data saved.");
      })
      .catch((e) => {
        logger.error(e);
        if (e instanceof HttpError && e.statusCode === 401) {
          logger.info("Setup an InfluxDB database!");
        }
        logger.warn("\nFinished with Errors");
      });
  } catch (err) {
    logger.error(err);
  }
};

main();
