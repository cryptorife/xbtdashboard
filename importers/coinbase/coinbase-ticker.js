const logger = require("../../server/winston")(module);
const axios = require("axios");
const { InfluxDB, Point, HttpError } = require("@influxdata/influxdb-client");
const { url, bucket, token, org } = require("./env");

const writeApi = new InfluxDB({ url, token }).getWriteApi(org, bucket, "ms");

const main = async () => {
  try {
    let endp = "https://api.pro.coinbase.com";
    let coinbase = await axios.get(`${endp}/products/BTC-USD/ticker`);
    if (!coinbase) throw "Unable to fetch coinbase data";
    const p = new Point(`ticker`)
      .floatField("volume", parseFloat(coinbase.data.volume))
      .floatField("price", parseFloat(coinbase.data.price))
      .timestamp(new Date(coinbase.data.time));
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
