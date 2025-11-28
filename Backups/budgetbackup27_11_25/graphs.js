// graphs.js – show over-budget categories using shared state.js

function formatCurrency(v) {
  if (isNaN(v)) v = 0;
  return '$' + v.toFixed(2);
}

// Load global state
let gState = State.load();
if (!Array.isArray(gState.categories)) gState.categories = [];
if (!Array.isArray(gState.ledger)) gState.ledger = [];

// Compute actual spend per category (same logic as budget page)
// We treat negative amounts as spend and sum the absolute value.
function computeActualsByCategory() {
  const map = {};
  (gState.ledger || []).forEach(row => {
    if (!row || typeof row.amount !== 'number') return;

    const catName = row.category || 'Uncategorised';
    const amt = row.amount;

    // only count spend (negative amounts)
    if (amt < 0) {
      if (!map[catName]) map[catName] = 0;
      map[catName] += Math.abs(amt);
    }
  });
  return map;
}

function buildOverBudgetList() {
  const actuals = computeActualsByCategory();
  const over = [];

  (gState.categories || []).forEach(cat => {
    const budget = cat.budgetMonthly ?? null;
    if (budget == null || isNaN(budget)) return;

    const actual = Math.abs(actuals[cat.name] || 0);
    const diff = actual - budget;

    if (diff > 0.0001) {
      over.push({
        name: cat.name,
        budget,
        actual,
        overBy: diff
      });
    }
  });

  // sort biggest over-budget first
  over.sort((a, b) => b.overBy - a.overBy);
  return over;
}

function renderTable(overList) {
  const tbody = document.querySelector('#overBudgetTable tbody');
  const noMsg = document.getElementById('noOverBudgetMsg');
  tbody.innerHTML = '';

  if (!overList.length) {
    if (noMsg) noMsg.style.display = 'block';
    return;
  }
  if (noMsg) noMsg.style.display = 'none';

  overList.forEach(item => {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.textContent = item.name;
    tr.appendChild(tdName);

    const tdBudget = document.createElement('td');
    tdBudget.className = 'amount';
    tdBudget.textContent = formatCurrency(item.budget);
    tr.appendChild(tdBudget);

    const tdActual = document.createElement('td');
    tdActual.className = 'amount';
    tdActual.textContent = formatCurrency(item.actual);
    tr.appendChild(tdActual);

    const tdOver = document.createElement('td');
    tdOver.className = 'amount';
    tdOver.textContent = formatCurrency(item.overBy);
    tr.appendChild(tdOver);

    tbody.appendChild(tr);
  });
}

function renderBars(overList) {
  const wrap = document.getElementById('barContainer');
  wrap.innerHTML = '';

  if (!overList.length) return;

  const maxActual = Math.max(...overList.map(o => o.actual), 1);

  overList.forEach(item => {
    const row = document.createElement('div');
    row.style.marginBottom = '0.6rem';

    const label = document.createElement('div');
    label.textContent = `${item.name} – ${formatCurrency(item.actual)} (budget ${formatCurrency(item.budget)})`;
    label.style.fontSize = '0.85rem';
    label.style.marginBottom = '0.15rem';
    row.appendChild(label);

    const barBg = document.createElement('div');
    barBg.style.position = 'relative';
    barBg.style.height = '16px';
    barBg.style.borderRadius = '999px';
    barBg.style.background = '#e5e7eb';
    barBg.style.overflow = 'hidden';

    // budget marker (100% width for budget)
    const budgetBar = document.createElement('div');
    budgetBar.style.position = 'absolute';
    budgetBar.style.left = '0';
    budgetBar.style.top = '0';
    budgetBar.style.bottom = '0';
    budgetBar.style.width = Math.min((item.budget / maxActual) * 100, 100) + '%';
    budgetBar.style.background = '#93c5fd'; // light blue
    barBg.appendChild(budgetBar);

    // actual bar
    const actualBar = document.createElement('div');
    actualBar.style.position = 'absolute';
    actualBar.style.left = '0';
    actualBar.style.top = '0';
    actualBar.style.bottom = '0';
    actualBar.style.width = Math.min((item.actual / maxActual) * 100, 100) + '%';
    actualBar.style.background = '#f97373'; // light red
    barBg.appendChild(actualBar);

    row.appendChild(barBg);
    wrap.appendChild(row);
  });
}

function initGraphs() {
  const overList = buildOverBudgetList();
  renderTable(overList);
  renderBars(overList);
}

document.addEventListener('DOMContentLoaded', initGraphs);
