const configurationData = {
  supported_resolutions: ["1D"],
  exchanges: [
    {
      value: "Bitmex",
      name: "Bitmex",
      desc: "Bitmex",
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
    Bitmex: {
      isActive: true,
      isTopTier: true,
      pairs: {
        XBT: ["USD"],
      },
    },
  });
};
