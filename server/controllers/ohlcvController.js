const { InfluxDB, Point, HttpError } = require("@influxdata/influxdb-client");
const { url, token, org, bucket } = require("../env");
const logger = require("../winston")(module);

const queryApi = new InfluxDB({ url, token }).getQueryApi(org);

// start and stop should be in ISO strings
const queryOHLCV = (exchange, symbol, resolution, start, stop) =>
  new Promise((resolve, reject) => {
    if (symbol === "xbtusdusd") symbol = "xbtusd"; // FIXME
    let tf = "1m";
    let every = `${resolution}`;
    if (isNaN(parseInt(resolution))) {
      tf = "1d";
      every = "1d";
    }
    const fluxQuery = `
      from(bucket: "ohlcv1m")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "${exchange}-${symbol}" and r.tf == "${tf}")
        |> drop(columns: ["tf", "symbol"])
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> window(every:${every})
        |> reduce(
          identity: {open:0.0,high:0.0,low:0.0,close:0.0,volume:0.0},
          fn: (r, accumulator) => ({
               r with
               open: if accumulator.open == 0.0 then r.open else accumulator.open,
               high: if accumulator.high == 0.0 then r.high else if r.high > accumulator.high then r.high else accumulator.high,
               low: if accumulator.low == 0.0 then r.low else if r.low < accumulator.low then r.low else accumulator.low,
               close: r.close,
               volume: r.volume + accumulator.volume
          })
        )
        |> map(fn: (r) => ({
          r with
          x: r._time
          })
        )
        |> drop(columns: ["_measurement", "_start"])
    `;
    console.log(fluxQuery);
    let data = {
      open: [],
      high: [],
      low: [],
      close: [],
      volume: [],
      x: [],
    };
    queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        Object.keys(data).forEach((key) => {
          data[key].push(o[key]);
        });
      },
      error(err) {
        reject(err);
      },
      complete() {
        resolve(data);
        logger.info(
          `Query OHLCV ${exchange}-${symbol} tf=${tf} from ${start} to ${stop} result=${data.x.length}`
        );
      },
    });
  });

exports.ohlcv = async (req, res) => {
  try {
    const { tf } = req.params;
    let { start, end, exchange, symbol } = req.query;
    console.log(start, end);
    start = new Date(parseInt(start)).toISOString();
    end = new Date(parseInt(end)).toISOString();
    console.log(start, end);
    let bars = await queryOHLCV(exchange, symbol, tf, start, end);
    if (!bars) bars = [];
    res.send({ success: true, bars });
  } catch (err) {
    logger.error(err);
  }
};

const queryOI = (exchange, symbol, start, stop) =>
  new Promise((resolve, reject) => {
    const fluxQuery = `
      from(bucket: "xbtdashboard")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "${exchange}-${symbol}" and r._field == "openInterest")
        |> map(fn: (r) => ({
          r with
          x: r._time,
          y: r._value
          })
        )
        |> drop(columns: ["location", "host", "url", "_measurement", "symbol", "_start", "_stop", "_time", "_field", "_value"])
    `;
    let data = { x: [], y: [] };
    console.log(fluxQuery);
    queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        Object.keys(data).forEach((key) => {
          data[key].push(o[key]);
        });
      },
      error(err) {
        reject(err);
      },
      complete() {
        resolve(data);
        logger.info(
          `Query OI ${exchange}-${symbol} from ${start} to ${stop} result=${data.x.length}`
        );
      },
    });
  });

exports.openInterest = async (req, res) => {
  try {
    const { exchange, symbol } = req.params;
    const { start, end } = req.query;
    let oi = await queryOI(exchange, symbol, start, end);
    if (!oi) oi = [];
    res.send({ success: true, oi });
  } catch (err) {
    logger.error(err);
  }
};

const queryLiquidations = async (
  exchange,
  symbol,
  start,
  stop,
  threshold = 10
) =>
  new Promise((resolve, reject) => {
    const fluxQuery = `
      oi = from(bucket: "xbtdashboard")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "bitmex-xbtusd" and r._field == "openInterest")
        |> drop(columns: ["symbol", "_start", "_stop", "_measurement",  "host", "location", "url", "_field"])
        |> aggregateWindow(every:1m, fn:last)
        
      ohlcv = from(bucket: "ohlcv1m")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "bitmex-xbtusd" and r.tf == "1m")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> drop(columns: ["tf", "symbol", "_start", "_stop", "_measurement", "host", "location", "url"]) 

      join(tables:{oi:oi, ohlcv:ohlcv}, on:["_time"])
       |> difference()
       |> filter(fn: (r) => r._value > 0 and r.volume > ${threshold}*1000000)
       |> map(fn: (r) => ({
          r with
          x: r._time,
          y: if r.close > r.open then r.close * 0.9950248756218906 else r.close * 1.0050251256281406,
          d: if r.close > r.open then 1 else 0
          })
        )
    `;
    let data = { x: [], y: [], close: [], volume: [], d: [] };
    console.log(fluxQuery);
    queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        Object.keys(data).forEach((key) => {
          data[key].push(o[key]);
        });
      },
      error(err) {
        reject(err);
      },
      complete() {
        resolve(data);
        logger.info(
          `Query OI ${exchange}-${symbol} from ${start} to ${stop} result=${data.x.length}`
        );
      },
    });
  });

exports.liquidations = async (req, res) => {
  try {
    const { exchange, symbol } = req.params;
    const { start, end, threshold } = req.query;
    let liqs = await queryLiquidations(exchange, symbol, start, end, threshold);
    if (!liqs) liqs = [];
    res.send({ success: true, liqs });
  } catch (err) {
    logger.error(err);
  }
};
