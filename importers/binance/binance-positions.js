const logger = require("../../server/winston")(module);
const axios = require("axios");
const { InfluxDB, Point, HttpError } = require("@influxdata/influxdb-client");
const { url, bucket, token, org } = require("./env");

const writeApi = new InfluxDB({ url, token }).getWriteApi(org, bucket, "ms");

const main = async () => {
  try {
    let result = {};
    let endp = "https://fapi.binance.com";
    let topTradersAccRatio = await axios.get(
      `${endp}/futures/data/topLongShortAccountRatio`,
      {
        params: {
          symbol: "BTCUSDT",
          period: "5m",
          limit: 1,
        },
      }
    );
    if (!topTradersAccRatio) throw "Unable to fetch binance topTradersLSRAcc";
    if (topTradersAccRatio.data.length) {
      let r = topTradersAccRatio.data.pop();
      result.topTradersAccRatio = parseFloat(r.longShortRatio);
      result.topTradersAccLongs = parseFloat(r.longAccount);
      result.topTradersAccShorts = parseFloat(r.shortAccount);
    }

    let topTradersPosRatio = await axios.get(
      `${endp}/futures/data/topLongShortPositionRatio`,
      {
        params: {
          symbol: "BTCUSDT",
          period: "5m",
          limit: 1,
        },
      }
    );
    if (!topTradersPosRatio) throw "Unable to fetch binance topTradersLSRAcc";
    if (topTradersPosRatio.data.length) {
      let r = topTradersPosRatio.data.pop();
      result.topTradersPosRatio = parseFloat(r.longShortRatio);
      result.topTradersPosLongs = parseFloat(r.longAccount);
      result.topTradersPosShorts = parseFloat(r.shortAccount);
    }

    let allTradersAccRatio = await axios.get(
      `${endp}/futures/data/globalLongShortAccountRatio`,
      {
        params: {
          symbol: "BTCUSDT",
          period: "5m",
          limit: 1,
        },
      }
    );
    if (!allTradersAccRatio) throw "Unable to fetch binance topTradersLSRAcc";
    if (allTradersAccRatio.data.length) {
      let r = allTradersAccRatio.data.pop();
      result.allTradersAccRatio = parseFloat(r.longShortRatio);
      result.allTradersAccLongs = parseFloat(r.longAccount);
      result.allTradersAccShorts = parseFloat(r.shortAccount);
      result.time = r.timestamp;
    }

    let takerBuySellVolume = await axios.get(
      `${endp}/futures/data/takerlongshortRatio`,
      {
        params: {
          symbol: "BTCUSDT",
          period: "5m",
          limit: 1,
        },
      }
    );
    if (!takerBuySellVolume) throw "Unable to fetch binance takerBuySellVolume";
    if (takerBuySellVolume.data.length) {
      let r = takerBuySellVolume.data.pop();
      result.takerBuySellRatio = parseFloat(r.buySellRatio);
      result.sellVol = parseFloat(r.sellVol);
      result.buyVol = parseFloat(r.buyVol);
    }

    const p = new Point(`positions`)
      .tag("symbol", "BTCUSDT")
      // .floatField("openInterest", result.oi)
      .floatField("topTradersAccRatio", result.topTradersAccRatio)
      .floatField("topTradersAccLongs", result.topTradersAccLongs)
      .floatField("topTradersPosRatio", result.topTradersPosRatio)
      .floatField("topTradersPosLongs", result.topTradersPosLongs)
      .floatField("allTradersAccRatio", result.topTradersAccRatio)
      .floatField("allTradersAccLongs", result.topTradersAccLongs)
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
