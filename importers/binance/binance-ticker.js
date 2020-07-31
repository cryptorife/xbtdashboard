const logger = require("../../server/winston")(module);
const axios = require("axios");
const { InfluxDB, Point, HttpError } = require("@influxdata/influxdb-client");
const { url, bucket, token, org } = require("./env");

const writeApi = new InfluxDB({ url, token }).getWriteApi(org, bucket, "ms");

const main = async () => {
  try {
    let result = {};
    let endp = "https://fapi.binance.com";
    let oi = await axios.get(`${endp}/futures/data/openInterestHist `, {
      params: {
        symbol: "BTCUSDT",
        period: "5m",
        limit: 1,
      },
    });
    if (!oi) throw "Unable to fetch binance open interest";
    if (oi.data.length)
      result.oi = parseFloat(oi.data.pop().sumOpenInterestValue);

    let takerLongShortRatio = await axios.get(
      `${endp}/futures/data/takerlongshortRatio `,
      {
        params: {
          symbol: "BTCUSDT",
          period: "5m",
          limit: 1,
        },
      }
    );
    if (!takerLongShortRatio) throw "Unable to fetch binance open interest";
    if (takerLongShortRatio.data.length) {
      const data = takerLongShortRatio.data.pop();
      result.takerBuySellRatio = parseFloat(data.buySellRatio);
      result.buyVolume = parseFloat(data.buyVol);
      result.sellVolume = parseFloat(data.sellVol);
      result.time = data.timestamp;
    }

    const p = new Point(`ticker`)
      .tag("symbol", "BTCUSDT")
      .floatField("openInterest", result.oi)
      .floatField("buyVolume", result.buyVolume)
      .floatField("sellVolume", result.sellVolume)
      .floatField("takerBuySellRatio", result.takerBuySellRatio)
      .timestamp(new Date(result.time));

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
