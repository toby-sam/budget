// budget.js – FINAL VERSION WITH LEDGER + PH + DEVELOPERS SPEND

let stateB = State.load();   // <-- single source of truth

const elsB = {
  summaryIncome: document.getElementById('summaryIncome'),
  summaryHouse: document.getElementById('summaryHouse'),
  summarySamal: document.getElementById('summarySamal'),
  summaryTotalSpend: document.getElementById('summaryTotalSpend'),
  summaryProfitLoss: document.getElementById('summaryProfitLoss'),

  summaryLedgerSpend: document.getElementById('summaryLedgerSpend'),
  summaryPhSpend: document.getElementById('summaryPhSpend'),
  summaryDevSpend: document.getElementById('summaryDevSpend'),

  newCategoryName: document.getElementById('newCategoryName'),
  newCategoryMonthly: document.getElementById('newCategoryMonthly'),
  addCategoryBtn: document.getElementById('addCategoryBtn'),

  catBody: document.querySelector('#categoriesTable tbody'),

  saveBackupBtn: document.getElementById('saveBackupBtn'),
  loadBackupBtn: document.getElementById('loadBackupBtn'),
  loadBackupInput: document.getElementById('loadBackupInput')
};

function formatCurrency(v) {
  if (isNaN(v)) return '$0.00';
  return '$' + Number(v).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


/* =====================================================
   CATEGORY ACTUAL SPENDING (Ledger only)
   ===================================================== */
function computeActualsByCategory() {
  const map = {};
  (stateB.ledger || []).forEach(row => {
    if (!row || typeof row.amount !== 'number') return;

    const cat = row.category ? row.category.toLowerCase() : '';
    if (cat === 'income') return;

    const key = row.category || 'Uncategorised';
    if (!map[key]) map[key] = 0;
    map[key] += row.amount;
  });
  return map;
}


/* =====================================================
   COMPUTE TOTALS (Ledger + PH Spend)
   ===================================================== */
function computeTotals() {
  let ledgerSpend = 0;
  let phSpend = 0;

  // Ledger spend
  (stateB.ledger || []).forEach(row => {
    if (!row) return;

    const cat = row.category?.toLowerCase() || "";
    const amt = Number(row.amount) || 0;

    if (cat === "income") return;
    ledgerSpend += Math.abs(amt);
  });

  // Philippines spend (already AUD)
  (stateB.philippines || []).forEach(row => {
    const amt = Number(row.amountAud) || 0;
    phSpend += Math.abs(amt);
  });

  // Developer spend
  let devSpend = 0;
  (stateB.ledger || []).forEach(row => {
    if (row.category === "Developers") {
      devSpend += Math.abs(Number(row.amount) || 0);
    }
  });

  const totalSpend = ledgerSpend + phSpend;
  const income = stateB.income || 0;
  const profitLoss = income - totalSpend;

  // ------------------ Update UI ------------------
  elsB.summaryLedgerSpend.textContent = formatCurrency(ledgerSpend);
  elsB.summaryPhSpend.textContent = formatCurrency(phSpend);
  elsB.summaryDevSpend.textContent = formatCurrency(devSpend);

  elsB.summaryTotalSpend.textContent = formatCurrency(totalSpend);
  elsB.summaryProfitLoss.textContent = formatCurrency(profitLoss);
}


/* =====================================================
   SUMMARY BLOCK (INCOME, ALLOCATIONS)
   ===================================================== */
function renderSummary() {
  const income = stateB.income || 0;
  const houseAmt = income * (stateB.housePct / 100);
  const samalAmt = income * (stateB.samalPct / 100);

  elsB.summaryIncome.textContent = formatCurrency(income);
  elsB.summaryHouse.textContent =
    `${stateB.housePct}% (${formatCurrency(houseAmt)})`;
  elsB.summarySamal.textContent =
    `${stateB.samalPct}% (${formatCurrency(samalAmt)})`;

  computeTotals();
}


/* =====================================================
   RENDER CATEGORIES TABLE
   ===================================================== */
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

    const tdName = document.createElement('td');
    tdName.textContent = cat.name;
    tr.appendChild(tdName);

    const tdBudget = document.createElement('td');
    const budgetInput = document.createElement('input');
    budgetInput.type = 'number';
    budgetInput.step = '0.01';
    budgetInput.value = cat.budgetMonthly ?? 0;
    budgetInput.style.width = '100px';

    budgetInput.oninput = () => {
      stateB.categories[idx].budgetMonthly =
        parseFloat(budgetInput.value) || 0;
      State.save(stateB);
      renderCategories();
      renderSummary();
    };

    tdBudget.appendChild(budgetInput);
    tr.appendChild(tdBudget);

    const rawActual = actuals[cat.name] || 0;
    const actual = Math.abs(rawActual);

    const tdActual = document.createElement('td');
    tdActual.textContent = formatCurrency(actual);
    tr.appendChild(tdActual);

    const diff = (cat.budgetMonthly || 0) - actual;

    const tdDiff = document.createElement('td');
    tdDiff.textContent = formatCurrency(diff);
    tr.appendChild(tdDiff);

    const tdStatus = document.createElement('td');
    if (cat.budgetMonthly == null) {
      tdStatus.textContent = 'No budget';
    } else if (diff >= 0) {
      tdStatus.textContent = 'Under';
      tdStatus.className = 'status-positive';
    } else {
      tdStatus.textContent = 'Over';
      tdStatus.className = 'status-negative';
    }
    tr.appendChild(tdStatus);

    const tdActions = document.createElement('td');
    const del = document.createElement('button');
    del.textContent = '✕';
    del.className = 'secondary';
    del.onclick = () => {
      if (!confirm(`Delete category "${cat.name}"?`)) return;
      stateB.categories.splice(idx, 1);
      (stateB.ledger || []).forEach(row => {
        if (row.category === cat.name) row.category = null;
      });
      State.save(stateB);
      renderCategories();
      renderSummary();
    };
    tdActions.appendChild(del);
    tr.appendChild(tdActions);

    elsB.catBody.appendChild(tr);
  });
}


/* =====================================================
   ADD CATEGORY
   ===================================================== */
function addCategory() {
  const name = elsB.newCategoryName.value.trim();
  const monthly = parseFloat(elsB.newCategoryMonthly.value) || 0;

  if (!name) return alert('Please enter a category name.');
  if (stateB.categories.some(c => c.name.toLowerCase() === name.toLowerCase()))
    return alert('Category already exists.');

  stateB.categories.push({
    name,
    budgetMonthly: monthly
  });

  State.save(stateB);
  elsB.newCategoryName.value = '';
  elsB.newCategoryMonthly.value = '';

  renderCategories();
  renderSummary();
}


/* =====================================================
   BACKUP SAVE
   ===================================================== */
function downloadBackup() {
  const name = prompt("Enter a name for this backup (e.g., Nov26):");
  if (!name) return;

  const safe = name.replace(/[^a-z0-9_\-]/gi, "_");
  const blob = new Blob([JSON.stringify(stateB, null, 2)], {
    type: "application/json"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = safe + ".json";
  a.click();
}


/* =====================================================
   BACKUP LOAD
   ===================================================== */
function triggerLoadBackup() {
  elsB.loadBackupInput.click();
}

function handleBackupFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      stateB = JSON.parse(ev.target.result);
      State.save(stateB);
      renderSummary();
      renderCategories();
      alert("Backup loaded.");
    } catch {
      alert("Invalid file");
    }
  };
  reader.readAsText(file);
}


/* =====================================================
   EVENT WIRING
   ===================================================== */
elsB.addCategoryBtn.onclick = addCategory;
elsB.newCategoryName.onkeydown = e => (e.key === "Enter") && addCategory();
elsB.newCategoryMonthly.onkeydown = e => (e.key === "Enter") && addCategory();

elsB.saveBackupBtn.onclick = downloadBackup;
elsB.loadBackupBtn.onclick = triggerLoadBackup;
elsB.loadBackupInput.onchange = handleBackupFileChange;


/* =====================================================
   INITIAL RENDER
   ===================================================== */
renderSummary();
renderCategories();
