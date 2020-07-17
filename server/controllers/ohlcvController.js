const { InfluxDB, Point, HttpError } = require("@influxdata/influxdb-client");
const { url, token, org, bucket } = require("../env");
const logger = require("../winston")(module);

const queryApi = new InfluxDB({ url, token }).getQueryApi(org);

const query = (exchange, symbol, start = "-1d", end = "now") =>
  new Promise((resolve, reject) => {
    exchange = "bitmex";
    symbol = "xbtusd";
    const fluxQuery = `from(bucket:"${bucket}") |> range(start:${start}) |> filter(fn: (r) => r._measurement == "${exchange}-${symbol}")`;
    let data = [];
    console.log(fluxQuery);
    queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        data.push(o);
      },
      error(err) {
        reject(err);
      },
      complete() {
        resolve(data);
      },
    });
  });

exports.ohlcv1m = async (req, res) => {
  try {
    const { start, end, exchange, symbol } = req.query;
    const bars = await query(exchange, symbol, start, end);
    if (!bars) throw new Error("Unable to query database");
    res.send({ success: true, bars });
  } catch (err) {
    logger.error(err);
  }
};
