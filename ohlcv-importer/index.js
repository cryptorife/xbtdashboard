const ccxt = require("ccxt");
const {InfluxDB, Point, HttpError} = require('@influxdata/influxdb-client')
const {url, token, org, bucket} = require('./env')
const {hostname} = require('os')

const writeApi = new InfluxDB({url, token}).getWriteApi(org, bucket, 'ns')
writeApi.useDefaultTags({location: hostname()})

const queryApi = new InfluxDB({url, token}).getQueryApi(org)

const sleep = (ms) => new Promise (resolve => setTimeout (resolve, ms));

const fetchBitMex = async (since = 0) => {
	try {
		let bitmex = new ccxt.bitmex();
		let now = new Date();
		while (since < now.getTime()) {
			console.log('fetch since:', since)
			let partial = await bitmex.fetchOHLCV('BTC/USD', '5m', null, null, { startTime: since, count: 750});
			console.log(`found ${partial.length} records`)
			for (const e of partial) {
				//[time, open, high, low, close, volume]
				const p = new Point('bitmex-xbtusd').tag('type', 'BTC')
					.floatField('open', e[1])
					.floatField('high', e[2])
					.floatField('low', e[3])
					.floatField('close', e[4])
					.floatField('volume', e[5])
					.timestamp(new Date(e[0]))
				writeApi.writePoint(p);
			}
			if (since === partial[partial.length-1][0]) break;
			since = new Date(partial[partial.length-1][0]);
			console.log('Fetched till ', since);
			await sleep(bitmex.rateLimit);
		}
	} catch(err) {
		console.log(err);
	}
};

const queryBitMex = () => new Promise((resolve, reject) => {
	const fluxQuery = 'from(bucket:"ohlcv") |> range(start:0) |> filter(fn: (r) => r._measurement == "bitmex-xbtusd")'	
	let last = new Date(0);
	queryApi.queryRows(fluxQuery, {
	  next(row, tableMeta) {
	    const o = tableMeta.toObject(row)
	    // console.log(JSON.stringify(o, null, 2))
	    // console.log(
	    //   `${o._time} ${o._measurement} in '${o._field}': ${o._field}=${o._value}`
	    // )
	    let te = new Date(o._time);
	    last = te > last ? te : last;
	  },
	  error(err) {
	    reject(err);
	  },
	  complete() {
	    resolve(last);
	  },
	})
});

const main = async () => {
	try {
		let since = await queryBitMex();
		await fetchBitMex(since);
		writeApi
		  .close()
		  .then(() => {
		    console.log('FINISHED')
		  })
		  .catch(e => {
		    console.error(e)
		    if (e instanceof HttpError && e.statusCode === 401) {
		      console.log('setup an InfluxDB database.')
		    }
		    console.log('\nFinished ERROR')
		  })
	} catch(err) {
		console.log(err)
	}
}

main();