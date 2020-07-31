const logger = require("../../server/winston")(module);
const axios = require("axios");
const { InfluxDB, Point, HttpError } = require("@influxdata/influxdb-client");
const { url, bucket, token, org } = require("./env");

const writeApi = new InfluxDB({ url, token }).getWriteApi(org, bucket, "ms");

const main = async () => {
  try {
    let endp = "https://www.bitmex.com/api/v1";
    let bitmex = await axios.get(`${endp}/instrument?symbol=XBTUSD`);
    if (!bitmex) throw "Unable to fetch bitmex data";
    const instrument = bitmex.data.pop();
    const p = new Point(`instrument`)
      .tag("symbol", "XBTUSD")
      .floatField("volume", parseFloat(instrument.volume))
      .floatField("price", parseFloat(instrument.lastPrice))
      .floatField("fundingRate", parseFloat(instrument.fundingRate))
      .floatField(
        "indicativeFundingRate",
        parseFloat(instrument.indicativeFundingRate)
      )
      .floatField("bidPrice", parseFloat(instrument.bidPrice))
      .floatField("askPrice", parseFloat(instrument.askPrice))
      .floatField("openInterest", parseFloat(instrument.openInterest))
      .timestamp(new Date(instrument.timestamp));
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
