const axios = require("axios");
const logger = require("../../server/winston")(module);
const { InfluxDB, Point, HttpError } = require("@influxdata/influxdb-client");
const { url, bucket, token, org } = require("./env");

const writeApi = new InfluxDB({ url, token }).getWriteApi(org, bucket, "ms");
const queryApi = new InfluxDB({ url, token }).getQueryApi(org);

const flush = (writeApi) => {
  writeApi
    .flush()
    .then(() => {
      logger.info("Batch saved...");
    })
    .catch((e) => {
      logger.error(e);
      if (e instanceof HttpError && e.statusCode === 401) {
        logger.info("Setup an InfluxDB database!");
      }
      logger.warn("\nFinished ERROR");
    });
};

const fetchAllLiquidations = async (since, writeApi) => {
  try {
    let cont = true;
    let ts = Math.round(new Date().getTime() / 1000);
    while (cont) {
      logger.info(`Fetching liquidations since ${ts}`);
      const response = await axios.get(
        `https://api.rek.to/api/events/?timestamp=${ts}&symbol=XBTUSD&minSize=0`
      );
      if (!response) throw "Something went wrong";
      if (response.data.length === 0) {
        logger.info(`No more data to fetch`);
        cont = false;
        break;
      }
      logger.info(`Found ${response.data.length} liquidations`);
      for (const l of response.data) {
        const { symbol, side, price, leavesQty, timestamp } = l;
        logger.info(
          `${new Date(
            timestamp * 1000
          )} ${symbol} ${side} ${price} ${leavesQty}`
        );
        const p = new Point(`liquidations`)
          .tag("symbol", "XBTUSD")
          .tag("side", side)
          .floatField("price", price)
          .intField("qty", leavesQty)
          .timestamp(new Date(timestamp * 1000));
        writeApi.writePoint(p);
      }
      ts = response.data[response.data.length - 1].timestamp;
    }
  } catch (err) {
    logger.error(err);
  }
};

const getLastLiquidationSaved = (exchange, symbol, tf) =>
  new Promise((resolve, reject) => {
    let lastTimestamp;
    const fluxQuery = `
      from(bucket:"bitmex")
        |> range(start:0)
        |> filter(fn: (r) => r._measurement == "liquidations")
        |> drop(columns:["side", "_measurement", "symbol", "_value", "_field"])
        |> map(fn: (r) => ({r with _value:0}))
        |> last()
`;
    queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        lastTimestamp = new Date(o._time);
      },
      error(err) {
        reject(err);
      },
      complete() {
        resolve(lastTimestamp);
      },
    });
  });

const fetchLastLiquidations = async (since, writeApi) => {
  try {
    let cont = true;
    let ts = Math.round(new Date().getTime() / 1000);
    while (cont) {
      logger.info(
        `Fetching liquidations since from ${since} to ${new Date(ts * 1000)}`
      );
      const response = await axios.get(
        `https://api.rek.to/api/events/?timestamp=${ts}&symbol=XBTUSD&minSize=0`
      );
      if (!response) throw "Something went wrong";
      const data = response.data.filter(
        (r) => r.timestamp <= ts && r.timestamp >= since.getTime() / 1000
      );
      if (data.length === 0) {
        logger.info(`No more data to fetch`);
        cont = false;
        break;
      }
      logger.info(`Found ${data.length} liquidations`);
      console.log(data);
      for (const l of data) {
        const { symbol, side, price, leavesQty, timestamp, value_usd } = l;
        logger.info(
          `${new Date(
            timestamp * 1000
          )} ${symbol} ${side} ${price} ${leavesQty}`
        );
        const p = new Point(`liquidations`)
          .tag("symbol", "XBTUSD")
          .tag("side", side)
          .floatField("price", price)
          .intField("qty", leavesQty)
          .timestamp(new Date(timestamp * 1000));
        writeApi.writePoint(p);
      }
      ts = data[data.length - 1].timestamp;
    }
  } catch (err) {
    logger.error(err);
  }
};

const main = async () => {
  try {
    let since = await getLastLiquidationSaved();
    console.log(since);
    await fetchLastLiquidations(since, writeApi);
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
