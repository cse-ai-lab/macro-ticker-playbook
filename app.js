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

fetch("./data/latest.json")
  .then(r => r.json())
  .then(data => {
    rawData = data;
    generateHistory();

    document.getElementById("timestamp").innerText =
      "Last updated: " + data.timestamp;

    renderCards();
    renderRegime();
    renderSignals();
    renderChart();
  });



// ---- GENERATE TOY HISTORY ----

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

function getDelta(series) {
  if (!series || series.length < 2) return 0;

  const last = series[series.length - 1];
  const prev = series[series.length - 2];

  return ((last - prev) / prev * 100).toFixed(2);
}

function getColor(delta) {
  const d = parseFloat(delta);

  if (d > 0) return "#22c55e";   // green
  if (d < 0) return "#ef4444";   // red
  return "#9ca3af";              // neutral gray
}

function getFiltered(series) {
  const len = series.length;
  return series.slice(Math.max(0, len - range));
}

function normalize(series) {
  const base = series[0];
  return series.map(v => (v / base) * 100);
}

// ---------- UI RENDER ----------
function renderCards() {
  const container = document.getElementById("cards");
  container.innerHTML = "";

  Object.entries(groups).forEach(([group, tickers]) => {
    tickers.forEach(t => {
      const history = rawData.history[t] || [];
      const delta = getDelta(history);
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
          ${delta}%
        </div>
      `;

      container.appendChild(tile);
    });
  });
}

// ---------- REGIME ----------

function renderRegime() {
  const d = rawData;
  let r = "🟨 Neutral";

  if (d.UUP > 27.5 && d.GLD < 405 && d.SPY < 655) {
    r = "🟥 Liquidity Stress";
  } else if (d.USO > 112 && d.SPY < 655) {
    r = "🟧 Energy Shock";
  } else if (d.USO < 110 && d.SPY > 650) {
    r = "🟩 Risk-On";
  }

  document.getElementById("regime").innerText = r;
}

// ---------- SIGNALS ----------

function renderSignals() {
  const d = rawData;
  let signals = [];

  if (d.UUP > 27.5) signals.push("💵 Dollar strong → liquidity tightening");
  if (d.GLD < 405) signals.push("🪙 Gold weak → forced selling");
  if (d.USO > 112) signals.push("🛢 Oil elevated → energy shock");
  if (d.ITA > 220) signals.push("🛡 Defense strong → persistent conflict");

  document.getElementById("signals").innerHTML =
    signals.map(s => `<div>${s}</div>`).join("");
}

// ---------- CONTROLS ----------

function setRange(days) {
  range = days;
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
    let data = getFiltered(rawData.history[t]);

    if (mode === "norm") {
      data = normalize(data);
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
        x: { ticks: { color: "#aaa" } },
        y: { ticks: { color: "#aaa" } }
      }
    }
  });
}