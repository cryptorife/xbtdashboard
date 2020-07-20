const { InfluxDB, Point, HttpError } = require("@influxdata/influxdb-client");
const { url, token, org, bucket } = require("../env");
const logger = require("../winston")(module);

const queryApi = new InfluxDB({ url, token }).getQueryApi(org);

// start and stop should be in ISO strings
const query = (exchange, symbol, resolution, start, stop) =>
  new Promise((resolve, reject) => {
    if (symbol === "xbtusdusd") symbol = "xbtusd"; // FIXME
    let tf = "1m";
    let every = `${resolution}m`;
    if (isNaN(resolution)) {
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
          time: int(v:uint(v:r._time))/1000000000
          })
        )
        |> drop(columns: ["_measurement", "_start"])
    `;
    console.log(fluxQuery);
    let data = [];
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
        logger.info(
          `Query ${exchange}-${symbol} tf=${tf} from ${start} to ${stop} result=${data.length}`
        );
      },
    });
  });

exports.ohlcv = async (req, res) => {
  try {
    const { tf } = req.params;
    let { start, end, exchange, symbol } = req.query;
    start = new Date(parseInt(start)).toISOString();
    end = new Date(parseInt(end)).toISOString();
    console.log(start, end);
    let bars = await query(exchange, symbol, tf, start, end);
    if (!bars) bars = [];
    res.send({ success: true, bars });
  } catch (err) {
    logger.error(err);
  }
};
