const configurationData = {
  supported_resolutions: ["1D", "1W", "1M"],
  exchanges: [
    {
      value: "Bitfinex",
      name: "Bitfinex",
      desc: "Bitfinex",
    },
  ],
  symbols_types: [
    {
      name: "crypto",

      // `symbolType` argument for the `searchSymbols` method, if a user selects this symbol type
      value: "crypto",
    },
    // ...
  ],
};

exports.configuration_data_get = (req, res) => {
  res.send(configurationData);
};

exports.exchanges_get = (req, res) => {
  res.send({
    Bitfinex: {
      isActive: true,
      isTopTier: true,
      pairs: {
        BTC: ["USD"],
      },
    },
  });
};
