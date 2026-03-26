let rawData;
let chart;
let range = 365; // default 1Y
let mode = "norm";

const groups = {
  "Liquidity": ["UUP"],
  "Safe Haven": ["GLD"],
  "Risk": ["SPY"],
  "Energy": ["USO"],
  "Credit": ["APO", "KKR"],
  "Defense": ["ITA", "EIS"],
  "Global": ["FXI", "INDA"]
};

// ---------- LOAD DATA ----------

fetch("./data/latest.json")
  .then(r => r.json())
  .then(data => {
    rawData = data;

    // Only generate fake data if history missing
    if (!rawData.history || !rawData.history.dates) {
      generateHistory();
    }
    
    if (rawData.history.dates.length < 30) {
      generateHistory();
    }

    document.getElementById("timestamp").innerText =
      "Last updated: " + data.timestamp;

    renderCards();
    renderRegime();
    renderSignals();
    renderChart();
    renderLegend();
  });


// ---------- MOCK HISTORY (SAFE FALLBACK) ----------

function generateHistory() {
  const days = 365;

  const dates = [];
  const SPY = [];
  const GLD = [];
  const USO = [];
  const UUP = [];

  let spy = 600;
  let gld = 420;
  let uso = 90;
  let uup = 26;

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - i));

    dates.push(d.toISOString().slice(0, 10));

    spy += Math.random() * 4 - 2;
    gld += Math.random() * 2 - 1;
    uso += Math.random() * 3 - 1.5;
    uup += Math.random() * 0.1 - 0.05;

    SPY.push(Number(spy.toFixed(2)));
    GLD.push(Number(gld.toFixed(2)));
    USO.push(Number(uso.toFixed(2)));
    UUP.push(Number(uup.toFixed(2)));
  }

  rawData.history = { dates, SPY, GLD, USO, UUP };
}


// ---------- HELPERS ----------

function getFiltered(series) {
  const len = series.length;
  return series.slice(Math.max(0, len - range));
}

function getDelta(series) {
  if (!series || series.length < 2) return 0;

  const last = series[series.length - 1];
  const prev = series[series.length - 2];

  return ((last - prev) / prev * 100).toFixed(2);
}

// NEW: momentum (stronger signal)
function getMomentum(series, n = 5) {
  if (!series || series.length < n) return 0;

  const last = series[series.length - 1];
  const prev = series[series.length - n];

  return ((last - prev) / prev * 100).toFixed(2);
}

function getColor(delta) {
  const d = parseFloat(delta);

  if (d > 0) return "#22c55e";
  if (d < 0) return "#ef4444";
  return "#9ca3af";
}

function normalize(series) {
  if (!series || series.length === 0) return [];

  const base = series[0];
  return series.map(v => (v / base) * 100);
}


// ---------- UI: CARDS ----------

function renderCards() {
  const container = document.getElementById("cards");
  container.innerHTML = "";

  Object.entries(groups).forEach(([group, tickers]) => {
    tickers.forEach(t => {
      const fullSeries = rawData.history[t] || [];
      const history = getFiltered(fullSeries);

      const delta = getDelta(history);
      const momentum = getMomentum(history);
      const color = getColor(delta);

      let size = "small";
      if (["SPY", "UUP", "USO", "GLD"].includes(t)) size = "big";
      else if (["APO", "KKR", "ITA"].includes(t)) size = "med";

      const tile = document.createElement("div");
      tile.className = `tile ${size}`;
      tile.setAttribute("data-group", group);

      tile.innerHTML = `
        <div class="label">${t}</div>
        <div class="value">${rawData[t]}</div>
        <div class="delta" style="color:${color}">
          ${delta}% · ${momentum}%
        </div>
      `;

      container.appendChild(tile);
    });
  });
}


// ---------- REGIME ----------

function renderRegime() {
  const el = document.getElementById("regime");
  const d = rawData;

  let text = "Neutral";
  let cls = "yellow";

  if (d.UUP > 27.5 && d.GLD < 405 && d.SPY < 655) {
    text = "Liquidity Stress";
    cls = "red";
  } else if (d.USO > 112 && d.SPY < 655) {
    text = "Energy Shock";
    cls = "orange";
  } else if (d.USO < 110 && d.SPY > 650) {
    text = "Risk-On";
    cls = "green";
  }

  el.className = `regime-pill ${cls}`;
  el.innerText = text;
}


// ---------- LEGEND ----------

function renderLegend() {
  const el = document.getElementById("legend");

  const items = [
    ["Liquidity", "#3b82f6"],
    ["Safe Haven", "#eab308"],
    ["Risk", "#22c55e"],
    ["Energy", "#f97316"],
    ["Credit", "#a855f7"],
    ["Defense", "#ef4444"],
    ["Global", "#14b8a6"]
  ];

  el.innerHTML = items.map(([name, color]) => `
    <span class="legend-item">
      <span class="dot" style="background:${color}"></span>
      ${name}
    </span>
  `).join("");
}


// ---------- SIGNALS (NOW TIMEFRAME-AWARE) ----------

function renderSignals() {
  const el = document.getElementById("signals");
  if (!el) return;

  const h = {
    UUP: getFiltered(rawData.history.UUP || []),
    GLD: getFiltered(rawData.history.GLD || []),
    USO: getFiltered(rawData.history.USO || []),
    ITA: getFiltered(rawData.history.ITA || [])
  };

  let signals = [];

  if (getMomentum(h.UUP) > 0.3) signals.push("💵 Tight");
  if (getMomentum(h.GLD) < -0.5) signals.push("🪙 Gold↓");
  if (getMomentum(h.USO) > 1.5) signals.push("🛢 Oil↑");
  if (getMomentum(h.ITA) > 1.0) signals.push("🛡 Defense↑");

  el.innerHTML = signals.map(s => `<span class="chip">${s}</span>`).join("");
}


// ---------- CONTROLS ----------

function setRange(days) {
  range = days;
  renderCards();
  renderSignals();
  renderChart();
}

function setMode(m) {
  mode = m;
  renderChart();
}


// ---------- CHART ----------

function renderChart() {
  const labels = getFiltered(rawData.history.dates);

  const tickers = ["SPY", "GLD", "USO", "UUP"];

  const datasets = tickers.map(t => {
    const full = rawData.history[t];
    const sliced = getFiltered(full);

    let data = sliced;

    if (mode === "norm") {
      data = normalize(sliced);
    }

    return {
      label: t,
      data,
      borderWidth: 2,
      tension: 0.25
    };
  });

  if (chart) chart.destroy();

  

  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#fff" } }
      },
      scales: {
        x: {
          ticks: { color: "#aaa", maxTicksLimit: 8 },
          grid: { color: "#1f2937" }
        },
        y: {
          ticks: { color: "#aaa" },
          grid: { color: "#1f2937" }
        }
      },
      plugins: {
        legend: {
          labels: { color: "#ddd" }
        }
      }
    }
  });
}