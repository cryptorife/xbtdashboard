const logger = require("../winston")(module);
const axios = require("axios");

exports.bitfinex = async (req, res) => {
  try {
    let longs = await axios.get(
      `https://api-pub.bitfinex.com/v2/stats1/pos.size:1m:tBTCUSD:long/last`
    );
    if (!longs) throw "Unable to fetch bitfinex longs";
    let shorts = await axios.get(
      `https://api-pub.bitfinex.com/v2/stats1/pos.size:1m:tBTCUSD:short/last`
    );
    if (!shorts) throw "Unable to fetch bitfinex shorts";
    res.send({
      time: longs.data[0],
      longs: longs.data[1],
      shorts: shorts.data[1],
      delta: longs.data[1] - shorts.data[1],
    });
    res.end();
  } catch (err) {
    logger.error(err);
  }
};

exports.binance = async (req, res) => {
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

    res.send(result);
    res.end();
  } catch (err) {
    logger.error(err);
  }
};

exports.okex = async (req, res) => {
  try {
    let endp = "https://aws.okex.com";
    let oi = await axios.get(
      `${endp}/api/swap/v3/instruments/BTC-USD-SWAP/open_interest`
    );
    if (!oi) throw "Unable to fetch okex open interest";
    res.send({
      time: oi.data.timestamp,
      openInterest: parseFloat(oi.data.amount),
    });
    res.end();
  } catch (err) {
    logger.error(err);
  }
};

exports.coinbase = async (req, res) => {
  try {
    let endp = "https://api.pro.coinbase.com";
    let coinbase = await axios.get(`${endp}/products/BTC-USD/ticker`);
    if (!coinbase) throw "Unable to fetch coinbase data";
    res.send({
      time: coinbase.data.time,
      volume: parseFloat(coinbase.data.volume),
      price: parseFloat(coinbase.data.price),
    });
    res.end();
  } catch (err) {
    logger.error(err);
  }
};
