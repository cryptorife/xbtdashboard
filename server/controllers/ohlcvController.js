const { InfluxDB, Point, HttpError } = require("@influxdata/influxdb-client");
const { url, token, org, bucket } = require("../env");
const logger = require("../winston")(module);

const queryApi = new InfluxDB({ url, token }).getQueryApi(org);

// start and stop should be in ISO strings
const query = (exchange, symbol, tf = "1d", start, stop) =>
  new Promise((resolve, reject) => {
    const fluxQuery = `
      from(bucket: "ohlcv1m")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "${exchange}-${symbol}" and r.tf == "${tf}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> map(fn: (r) => ({
            r with
            time: int(v:uint(v:r._time))/1000000000
          })
        )
        |> drop(columns: ["_measurement", "_start", "_stop", "_time"])
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
      },
    });
  });

exports.ohlcv1m = async (req, res) => {
  try {
    let { start, end, exchange, symbol } = req.query;
    start = new Date(parseInt(start)).toISOString();
    end = new Date(parseInt(end)).toISOString();
    console.log(start, end);
    let bars = await query(exchange, symbol, "1d", start, end);
    if (!bars) bars = [];
    res.send({ success: true, bars });
  } catch (err) {
    logger.error(err);
  }
};
