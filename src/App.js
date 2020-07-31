import React, { useState, useEffect } from "react";
import _ from "lodash";
import Plot from "react-plotly.js";
import axios from "axios";
import Container from "@material-ui/core/Container";
import Button from "@material-ui/core/Button";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import { makeStyles } from "@material-ui/core/styles";

const green = "#3CB371";
const red = "#DC143C";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    "& > *": {
      margin: theme.spacing(1),
    },
  },
  chart: {
    margin: "auto",
  },
}));

function BasicButtonGroup(props) {
  console.log("selection", props.selection);
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <ToggleButtonGroup
        value={props.selection}
        exclusive
        onChange={props.handleSelectionChange}
      >
        <ToggleButton value="15">15m</ToggleButton>
        <ToggleButton value="60">1h</ToggleButton>
        <ToggleButton value="240">4h</ToggleButton>
        <ToggleButton value="720">12h</ToggleButton>
        <ToggleButton value="1440">1d</ToggleButton>
        <ToggleButton value="4320">3d</ToggleButton>
        <ToggleButton value="10080">1w</ToggleButton>
        <ToggleButton value="20160">2w</ToggleButton>
        <ToggleButton value="40320">1m</ToggleButton>
      </ToggleButtonGroup>
      <ToggleButtonGroup
        value={props.threshold}
        exclusive
        onChange={props.handleThresholdChange}
      >
        <ToggleButton value="10">10mm</ToggleButton>
        <ToggleButton value="15">15mm</ToggleButton>
        <ToggleButton value="20">20mm</ToggleButton>
      </ToggleButtonGroup>
      <Button onClick={props.handleRefresh}>Refresh</Button>
    </div>
  );
}

const config = { responsive: true };

const baseLayout = {
  uirevision: "true",
  autosize: false,
  height: 500,
  width: 1024,
  hovermode: "closest",
  xaxis: {
    rangeslider: {
      visible: false,
    },
    showspikes: true,
    spikecolor: "#A9A9A9",
    spikedash: "solid",
    spikemode: "across",
    spikesnap: "cursor",
    spikethickness: 2,
    uirevision: "no reset of zoom",
  },
  yaxis: {
    showspikes: true,
    spikecolor: "#A9A9A9",
    spikedash: "solid",
    spikemode: "across",
    spikesnap: "cursor",
    spikethickness: 2,
    uirevision: "no reset of zoom",
  },
};

function Plotly(props) {
  const classes = useStyles();
  return (
    <Plot
      className={classes.chart}
      data={props.data}
      config={config}
      layout={props.layout}
    />
  );
}

function setLiquidationLines(data) {
  const bars = data[0];
  const liqs = data[1];
  return liqs.x.map((x0, i) => {
    const y = liqs.y[i];
    let x1 = bars.x[bars.x.length - 1];
    for (const ix in bars.x) {
      if (bars.x[ix] < x0) continue;
      if (bars.high[ix] > y && bars.low[ix] < y) {
        x1 = bars.x[ix];
        break;
      }
    }
    return {
      line: {
        color: liqs.d[i] == "1" ? green : red,
        dash: "dot",
        width: 1,
      },
      opacity: 1,
      type: "line",
      x0,
      x1,
      y0: y,
      y1: y,
      yref: "y",
    };
  });
}

async function fetchBars(since, threshold = 10) {
  try {
    let data = [];
    const ohlcv = await axios.get("/api/ohlcv/1m", {
      params: {
        exchange: "bitmex",
        symbol: "xbtusd",
        resolution: 1,
        start: since.getTime(),
        end: new Date().getTime(),
      },
    });
    if (!ohlcv || !ohlcv.data.success) throw new Error("Unable to fetch price");
    data = [
      ...data,
      {
        ...ohlcv.data.bars,
        type: "candlestick",
        xaxis: "x",
        yaxis: "y",
      },
    ];
    console.log(`received ${ohlcv.data.bars.length} bars`);

    const liqs = await axios.get("/api/liquidations/bitmex/xbtusd", {
      params: {
        start: since,
        end: new Date(),
        threshold,
      },
    });
    if (!liqs || !liqs.data.success) throw new Error("Unable to fetch price");

    data = [
      ...data,
      {
        ...liqs.data.liqs,
        mode: "markers",
        text: liqs.data.liqs.volume.map(
          (v, ix) =>
            `entry=${liqs.data.liqs.close[ix]} size=${v / 2000000 + "m"}`
        ),
        textposition: "top",
        marker: {
          size: liqs.data.liqs.volume.map((v) => v / 2000000),
          color: liqs.data.liqs.d.map((d) => (d == "1" ? green : red)),
        },
      },
    ];

    console.log(`received ${liqs.data.liqs.length} liquidations`);
    return data;
  } catch (err) {
    console.error(err);
  }
}

async function fetchOpenInterest(since) {
  try {
    const oi = await axios.get("/api/oi/bitmex/xbtusd", {
      params: {
        start: since,
        end: new Date(),
      },
    });
    if (!oi || !oi.data.success) throw new Error("Unable to fetch oi");
    console.log(`received ${oi.data.oi.length} bars`);
    return [
      {
        ...oi.data.oi,
        type: "scatter",
      },
    ];
  } catch (err) {
    console.error(err);
  }
}

function App(props) {
  const [since, setSince] = useState("60");
  const [threshold, setThreshold] = useState("20");
  const [start, setStart] = useState("");
  const [bars, setBars] = useState([]);
  const [openInterest, setOpenInterest] = useState([]);
  const [liqs, setLiqs] = useState([]);
  const [shapes, setShapes] = useState([]);

  useEffect(() => {
    init(new Date(new Date() - 60 * 60000));
  }, []);

  async function init(start, threshold) {
    const bars = await fetchBars(start, threshold);
    // const openInterest = await fetchOpenInterest(start);
    const shapes = setLiquidationLines(bars);
    setBars(bars);
    // setOpenInterest(openInterest);
    setShapes(shapes);
  }

  function handleSinceChange(e, v) {
    const start = new Date(new Date() - parseInt(v) * 60000);
    setSince(v);
    setStart(start);
    init(start, threshold);
  }

  function handleThresholdChange(e, v) {
    setThreshold(v);
    init(start, v);
  }

  function handleRefresh() {
    init(start, threshold);
  }

  return (
    <div className="App">
      <Container lg={12}>
        <BasicButtonGroup
          selection={since}
          threshold={threshold}
          handleSelectionChange={handleSinceChange}
          handleThresholdChange={handleThresholdChange}
          handleRefresh={handleRefresh}
        />
        <Plotly data={bars} layout={{ ...baseLayout, shapes }} />
        <br />
        <Plotly data={openInterest} layout={baseLayout} />
      </Container>
    </div>
  );
}

export default App;
