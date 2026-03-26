let rawData;
let chart;
let range = 9999;
let mode = "raw";

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
    document.getElementById("timestamp").innerText = "Last updated: " + data.timestamp;

    renderCards();
    renderRegime();
    renderChart();
  });

function renderCards() {
  const container = document.getElementById("cards");
  container.innerHTML = "";

  Object.entries(groups).forEach(([group, tickers]) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "group";

    groupDiv.innerHTML = `<div class="group-title">${group}</div>`;

    const cardsDiv = document.createElement("div");
    cardsDiv.className = "cards";

    tickers.forEach(t => {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <div class="label">${t}</div>
        <div class="value">${rawData[t]}</div>
      `;

      cardsDiv.appendChild(card);
    });

    groupDiv.appendChild(cardsDiv);
    container.appendChild(groupDiv);
  });
}

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

function setRange(r) {
  range = r;
  renderChart();
}

function setMode(m) {
  mode = m;
  renderChart();
}

function normalize(series) {
  const base = series[0];
  return series.map(v => (v / base) * 100);
}

function renderChart() {
  const labels = rawData.history.dates.slice(-range);

  const datasets = ["SPY", "GLD", "USO", "UUP"].map(t => {
    let data = rawData.history[t].slice(-range);

    if (mode === "norm") {
      data = normalize(data);
    }

    return {
      label: t,
      data: data,
      borderWidth: 2
    };
  });

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: { labels, datasets },
    options: {
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