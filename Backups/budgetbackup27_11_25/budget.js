// budget.js – clean version using state.js only

let stateB = State.load();   // <-- single source of truth

const elsB = {
  summaryIncome: document.getElementById('summaryIncome'),
  summaryHouse: document.getElementById('summaryHouse'),
  summarySamal: document.getElementById('summarySamal'),
  summaryTotalSpend: document.getElementById('summaryTotalSpend'),
  summaryProfitLoss: document.getElementById('summaryProfitLoss'),
  newCategoryName: document.getElementById('newCategoryName'),
  newCategoryMonthly: document.getElementById('newCategoryMonthly'),
  addCategoryBtn: document.getElementById('addCategoryBtn'),
  catBody: document.querySelector('#categoriesTable tbody'),
  saveBackupBtn: document.getElementById('saveBackupBtn'),
  loadBackupBtn: document.getElementById('loadBackupBtn'),
  loadBackupInput: document.getElementById('loadBackupInput')
};

// =========================
// Currency Formatter (with commas)
// =========================
function formatCurrency(v) {
  const n = Number(v);
  if (isNaN(n)) return "$0.00";
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

// =========================
// Actuals by Category
// =========================
function computeActualsByCategory() {
  const map = {};
  (stateB.ledger || []).forEach(row => {
    if (!row || typeof row.amount !== 'number') return;

    const cat = (row.category || '').toLowerCase();
    if (cat === 'income') return;

    const key = row.category || "Uncategorised";
    if (!map[key]) map[key] = 0;
    map[key] += row.amount;
  });
  return map;
}

// =========================
// Ledger Total (AUD only)
// =========================
function computeLedgerTotals() {
  let ledgerTotal = 0;

  (stateB.ledger || []).forEach(tx => {
    if (!tx) return;

    const cat = (tx.category || '').toLowerCase();
    if (cat === 'income') return;

    const amt = typeof tx.amount === "number" ? tx.amount : parseFloat(tx.amount) || 0;

    if (amt < 0) {
      ledgerTotal += Math.abs(amt);   // -120 → +120
    }
  });

  const el = document.getElementById("summaryLedger");
  if (el) el.textContent = formatCurrency(ledgerTotal);

  return ledgerTotal;
}

// =========================
// Philippines Total (AUD)
// =========================
function computePhilippinesTotals() {
  const phTotal = Math.abs(
    (stateB.philippines || []).reduce(
      (sum, tx) => sum + (tx.amountAud || tx.amount || 0),
      0
    )
  );

  const el = document.getElementById("summaryPhilippines");
  if (el) el.textContent = formatCurrency(phTotal);

  return phTotal;
}

// =========================
// Overall Totals
// =========================
function computeTotals() {
  const ledgerAUD = computeLedgerTotals();
  const philAUD = computePhilippinesTotals();

  const totalSpend = ledgerAUD + philAUD;
  const income = stateB.income || 0;
  const profitLoss = income - totalSpend;

  elsB.summaryTotalSpend.textContent = formatCurrency(totalSpend);
  elsB.summaryProfitLoss.textContent = formatCurrency(profitLoss);
}

// =========================
// Summary Panel
// =========================
function renderSummary() {
  const income = stateB.income || 0;
  const houseAmt = income * (stateB.housePct / 100);
  const samalAmt = income * (stateB.samalPct / 100);

  elsB.summaryIncome.textContent = formatCurrency(income);
  elsB.summaryHouse.textContent =
    `${stateB.housePct}% (${formatCurrency(houseAmt)})`;
  elsB.summarySamal.textContent =
    `${stateB.samalPct}% (${formatCurrency(samalAmt)})`;

  // Total Budget (sum of monthly budgets)
  const totalBudget = (stateB.categories || [])
    .reduce((sum, c) => sum + (c.budgetMonthly || 0), 0);

  const el = document.getElementById("summaryTotalBudget");
  if (el) el.textContent = formatCurrency(totalBudget);

  computeTotals();
}

// =========================
// Categories Rendering
// =========================
function renderCategories() {
  const actuals = computeActualsByCategory();
  elsB.catBody.innerHTML = '';

  const sorted = [...stateB.categories].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  sorted.forEach(cat => {
    const idx = stateB.categories.findIndex(c => c.name === cat.name);
    if (idx === -1) return;

    const tr = document.createElement('tr');

    // Name
    const tdName = document.createElement('td');
    tdName.textContent = cat.name;
    tr.appendChild(tdName);

    // Budget
    const tdBudget = document.createElement('td');
    tdBudget.className = 'amount';

    const budgetInput = document.createElement('input');
    budgetInput.type = 'number';
    budgetInput.step = '0.01';
    budgetInput.value = cat.budgetMonthly ?? 0;
    budgetInput.style.width = '100px';

    budgetInput.addEventListener('input', () => {
      const val = parseFloat(budgetInput.value) || 0;
      stateB.categories[idx].budgetMonthly = val;
      State.save(stateB);
      renderCategories();
      renderSummary();
    });

    tdBudget.appendChild(budgetInput);
    tr.appendChild(tdBudget);

    // Actual
    const rawActual = actuals[cat.name] || 0;
    const actual = Math.abs(rawActual);

    const tdActual = document.createElement('td');
    tdActual.className = 'amount';
    tdActual.textContent = formatCurrency(actual);
    tr.appendChild(tdActual);

    // Difference
    const budgetVal = cat.budgetMonthly || 0;
    const diff = budgetVal - actual;

    const tdDiff = document.createElement('td');
    tdDiff.className = 'amount';
    tdDiff.textContent = formatCurrency(diff);
    tr.appendChild(tdDiff);

    // Status
    const tdStatus = document.createElement('td');
    if (cat.budgetMonthly == null) {
      tdStatus.textContent = 'No budget';
      tdStatus.className = 'status-neutral';
    } else if (diff >= 0) {
      tdStatus.textContent = 'Under budget';
      tdStatus.className = 'status-positive';
    } else {
      tdStatus.textContent = 'Over budget';
      tdStatus.className = 'status-negative';
    }
    tr.appendChild(tdStatus);

    // Delete
    const tdActions = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.className = 'secondary';

    delBtn.onclick = () => {
      if (!confirm(`Delete category "${cat.name}"?`)) return;

      stateB.categories.splice(idx, 1);

      (stateB.ledger || []).forEach(row => {
        if (row.category === cat.name) row.category = null;
      });

      State.save(stateB);
      renderCategories();
      renderSummary();
    };

    tdActions.appendChild(delBtn);
    tr.appendChild(tdActions);

    elsB.catBody.appendChild(tr);
  });
}

// =========================
// Add Category
// =========================
function addCategory() {
  const name = elsB.newCategoryName.value.trim();
  const monthly = parseFloat(elsB.newCategoryMonthly.value) || 0;

  if (!name) return alert('Please enter a category name.');
  if (stateB.categories.some(c => c.name.toLowerCase() === name.toLowerCase()))
    return alert('Category already exists.');

  stateB.categories.push({ name, budgetMonthly: monthly });
  State.save(stateB);

  elsB.newCategoryName.value = '';
  elsB.newCategoryMonthly.value = '';

  renderCategories();
  renderSummary();
}

// =========================
// Backup Save/Load
// =========================
function downloadBackup() {
  const name = prompt("Enter a name for this backup file:");
  if (!name) return;

  const safe = name.replace(/[^a-z0-9_\-]/gi, "_");
  const blob = new Blob([JSON.stringify(stateB, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safe + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

function triggerLoadBackup() {
  elsB.loadBackupInput.click();
}

function handleBackupFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      stateB = parsed;
      State.save(stateB);
      renderSummary();
      renderCategories();
      alert("Backup loaded.");
    } catch {
      alert("Invalid backup file.");
    }
  };

  reader.readAsText(file);
}

// =========================
// Wiring
// =========================
elsB.addCategoryBtn.onclick = addCategory;
elsB.saveBackupBtn.onclick = downloadBackup;
elsB.loadBackupBtn.onclick = triggerLoadBackup;
elsB.loadBackupInput.onchange = handleBackupFileChange;

elsB.newCategoryName.onkeydown = e => (e.key === "Enter" ? addCategory() : null);
elsB.newCategoryMonthly.onkeydown = e => (e.key === "Enter" ? addCategory() : null);

// =========================
// Initial Render
// =========================
renderSummary();
renderCategories();
