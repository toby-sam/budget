// budget-graphs.js
// Uses shared State (from state.js) to show over-budget categories
// and lets you close the month / clear transactions.

// Load shared state once; we’ll refresh it inside actions when needed.
let state = State.load();

// ---------- Helpers ----------

// Build a map: category name -> actual spend (positive number) this month.
function computeActualsByCategory() {
  const map = {};
  (state.ledger || []).forEach(row => {
    if (!row) return;
    const rawAmt = Number(row.amount) || 0;
    // Expenses are negative in the ledger – convert to positive spend.
    if (rawAmt >= 0) return;

    const name = row.category || 'Uncategorised';
    if (!map[name]) map[name] = 0;
    map[name] += Math.abs(rawAmt);
  });
  return map;
}

function getOverBudgetCategories() {
  const actuals = computeActualsByCategory();
  const cats = state.categories || [];

  const rows = cats.map(c => {
    const budget = Number(c.budgetMonthly) || 0;
    const actual = actuals[c.name] || 0;
    const diff = actual - budget;
    return {
      name: c.name,
      budget,
      actual,
      diff
    };
  });

  // only categories where actual > budget and budget > 0
  return rows
    .filter(r => r.budget > 0 && r.actual > r.budget)
    .sort((a, b) => b.diff - a.diff); // largest overspend first
}

// ---------- Rendering ----------

function renderOverBudget() {
  const container = document.getElementById('overBudgetContainer');
  if (!container) return;

  const data = getOverBudgetCategories();
  container.innerHTML = '';

  if (!data.length) {
    const p = document.createElement('p');
    p.className = 'graph-empty';
    p.textContent = 'Nice work – no categories are currently over budget!';
    container.appendChild(p);
    return;
  }

  const maxActual = Math.max(
    1,
    ...data.map(d => d.actual)
  );

  data.forEach(cat => {
    const rowEl = document.createElement('div');
    rowEl.className = 'graph-row';

    // Label
    const label = document.createElement('div');
    label.className = 'graph-label';
    label.textContent = cat.name;
    rowEl.appendChild(label);

    // Numbers
    const amounts = document.createElement('div');
    amounts.className = 'graph-amounts';
    amounts.innerHTML =
      `Budget: $${cat.budget.toFixed(2)}<br>` +
      `Actual: $${cat.actual.toFixed(2)}`;
    rowEl.appendChild(amounts);

    // Bars
    const bars = document.createElement('div');
    bars.className = 'graph-bars';

    const budgetTrack = document.createElement('div');
    budgetTrack.className = 'graph-bar-track';
    const budgetBar = document.createElement('div');
    budgetBar.className = 'graph-bar-budget';
    budgetBar.style.width = `${(cat.budget / maxActual) * 100}%`;
    budgetTrack.appendChild(budgetBar);

    const actualTrack = document.createElement('div');
    actualTrack.className = 'graph-bar-track';
    const actualBar = document.createElement('div');
    actualBar.className = 'graph-bar-actual';
    actualBar.style.width = `${(cat.actual / maxActual) * 100}%`;
    actualTrack.appendChild(actualBar);

    bars.appendChild(budgetTrack);
    bars.appendChild(actualTrack);
    rowEl.appendChild(bars);

    // Diff text
    const diff = document.createElement('div');
    diff.className = 'graph-diff';
    diff.textContent = `+ $${cat.diff.toFixed(2)}`;
    rowEl.appendChild(diff);

    container.appendChild(rowEl);
  });
}
let pieChartInstance = null;

function renderPieChart() {
  const ctx = document.getElementById("pieChart");
  if (!ctx) return;

  const actuals = computeActualsByCategory();
  const labels = Object.keys(actuals);
  const values = Object.values(actuals);

  if (pieChartInstance) {
    pieChartInstance.destroy();
  }

  pieChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [
          "#2563eb", "#10b981", "#f59e0b", "#ef4444",
          "#6366f1", "#14b8a6", "#f43f5e", "#84cc16",
          "#a855f7", "#0ea5e9"
        ]
      }]
    },
    options: {
      plugins: {
        legend: {
          position: "bottom"
        },
        datalabels: {
          color: "#ffffff",
          font: {
            weight: "bold",
            size: 12
          },
          formatter: function(value, ctx) {
            const label = ctx.chart.data.labels[ctx.dataIndex];
            return `${label} ($${value.toFixed(0)})`;
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

// ---------- Month close & clear actions ----------

function closeMonthAndSave() {
  const name = prompt(
    'Enter a name for this month (e.g. "Nov26").\nA file called <name>.json will be downloaded.'
  );
  if (!name) return;

  // Reload latest state in case other pages changed it.
  state = State.load();

  try {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    // After successful "save", clear ledger + PH transactions.
    state.ledger = [];
    state.philippines = [];
    State.save(state);

    // Re-render with cleared data.
    renderOverBudget();

    alert(`Month closed and saved to ${name}.json.\nLedger and Philippines transactions have been cleared.`);
  } catch (err) {
    console.error('Failed to close month:', err);
    alert('Something went wrong while creating the JSON file. Month was NOT cleared.');
  }
}

function clearAllTransactionsNoSave() {
  if (!confirm(
    'This will clear ALL ledger and Philippines transactions WITHOUT saving.\n\nAre you sure you want to continue?'
  )) {
    return;
  }

  state = State.load();
  state.ledger = [];
  state.philippines = [];
  State.save(state);

  renderOverBudget();
  alert('All ledger and Philippines transactions have been cleared.');
}

// ---------- Wiring ----------

function initBudgetGraphs() {
  // Make sure state has the arrays we expect
  if (!Array.isArray(state.ledger)) state.ledger = [];
  if (!Array.isArray(state.categories)) state.categories = [];
  if (!Array.isArray(state.philippines)) state.philippines = [];
  State.save(state);

  const closeBtn = document.getElementById('closeMonthBtn');
  const clearBtn = document.getElementById('clearAllTxBtn');

  if (closeBtn) closeBtn.addEventListener('click', closeMonthAndSave);
  if (clearBtn) clearBtn.addEventListener('click', clearAllTransactionsNoSave);

  renderOverBudget();
  renderPieChart();
}

document.addEventListener('DOMContentLoaded', initBudgetGraphs);
