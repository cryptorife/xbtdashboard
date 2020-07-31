const logger = require("../../server/winston")(module);

const axios = require("axios");
const { InfluxDB, Point, HttpError } = require("@influxdata/influxdb-client");
const { url, bucket, token, org } = require("./env");

const writeApi = new InfluxDB({ url, token }).getWriteApi(org, bucket, "ms");

const main = async () => {
  try {
    let longs = await axios.get(
      `https://api-pub.bitfinex.com/v2/stats1/pos.size:1m:tBTCUSD:long/last`
    );
    if (!longs) throw "Unable to fetch bitfinex longs";
    let shorts = await axios.get(
      `https://api-pub.bitfinex.com/v2/stats1/pos.size:1m:tBTCUSD:short/last`
    );
    if (!shorts) throw "Unable to fetch bitfinex shorts";
    const p = new Point(`positions`)
      .floatField("longs", parseFloat(longs.data[1]))
      .floatField("shorts", parseFloat(shorts.data[1]))
      .timestamp(new Date(longs.data[0]));
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
