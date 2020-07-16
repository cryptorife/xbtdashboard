const ccxt = require("ccxt");
const {InfluxDB, Point, HttpError} = require('@influxdata/influxdb-client')
const {url, token, org, bucket} = require('./env')
const {hostname} = require('os')

const writeApi = new InfluxDB({url, token}).getWriteApi(org, bucket, 'ns')
writeApi.useDefaultTags({location: hostname()})

const queryApi = new InfluxDB({url, token}).getQueryApi(org)

const args = process.argv.slice(2);

const sleep = (ms) => new Promise (resolve => setTimeout (resolve, ms));

const fetchBitMex = async (since = 0) => {
	try {
		let bitmex = new ccxt.bitmex();
		let now = new Date();
		since = new Date(since);
		while (since < now.getTime()) {
			console.log('fetch since:', since)
			let partial = await bitmex.fetchOHLCV('BTC/USD', '1m', null, null, { startTime: since, count: 750});
			console.log(`found ${partial.length} records`)
			let lastTs = 0;
			for (const e of partial) {
				if (e.indexOf(undefined) !== -1) continue;
				//[time, open, high, low, close, volume]
				const ts = new Date(e[0]);
				const p = new Point('bitmex-xbtusd')
					.tag('symbol', 'XBTUSD')
					.tag('tf', '1m')
					.floatField('open', e[1])
					.floatField('high', e[2])
					.floatField('low', e[3])
					.floatField('close', e[4])
					.floatField('volume', e[5])
					.timestamp(ts) 
				writeApi.writePoint(p);
				lastTs = ts;
			}
			console.log('Fetched till ', since, lastTs, new Date(since).getTime() === new Date(lastTs).getTime());
			if (since.getTime() === new Date(partial[partial.length-1][0]).getTime()) break;
			since = new Date(partial[partial.length-1][0]);
			await sleep(bitmex.rateLimit);
		}
	} catch(err) {
		console.log(err);
	}
};

const queryBitMex = () => new Promise((resolve, reject) => {
	const fluxQuery = `from(bucket:"${bucket}") |> range(start:-1d) |> filter(fn: (r) => r._measurement == "bitmex-xbtusd")`	
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

const updateBitMexOHLCV = async () => {
	try {
		let since = 0;
		switch(args[0]) {
			case "--origin":
				since = 0
				break;
			default:
				since = await queryBitMex();
				break;
		}
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
		console.log(err);
	}
}

const main = async () => {
	try {
		await updateBitMexOHLCV();
	} catch(err) {
		console.log(err)
	}
}

main();