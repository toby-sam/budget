// =============================================
// sam-budget.js – Sam Business Budget (AUD)
// =============================================

let stateSB = State.load();

// Ensure Sam Budget categories list exists
if (!Array.isArray(stateSB.samBudgetCategories)) {
  stateSB.samBudgetCategories = [];
}

// Normalise any legacy entries (strings → objects)
stateSB.samBudgetCategories = stateSB.samBudgetCategories.map(c => {
  if (typeof c === 'string') return { name: c, budgetMonthly: 0 };
  if (!c || !c.name) return { name: String(c), budgetMonthly: 0 };
  return {
    name: c.name,
    budgetMonthly: c.budgetMonthly || 0
  };
});

State.save(stateSB);

// ---------------------------------------------------
// Element references
// ---------------------------------------------------
const elsSB = {
  summaryIncome: document.getElementById('summaryIncome'),
  summaryTotalSpend: document.getElementById('summaryTotalSpend'),
  summaryProfitLoss: document.getElementById('summaryProfitLoss'),
  summaryTotalBudget: document.getElementById('summaryTotalBudget'),

  newCategoryName: document.getElementById('newCategoryName'),
  newCategoryMonthly: document.getElementById('newCategoryMonthly'),
  addCategoryBtn: document.getElementById('addCategoryBtn'),

  catBody: document.querySelector('#categoriesTable tbody'),

  saveBackupBtn: document.getElementById('saveBackupBtn'),
  loadBackupBtn: document.getElementById('loadBackupBtn'),
  loadBackupInput: document.getElementById('loadBackupInput'),
  refreshBtn: document.getElementById('refreshBtn')
};

// ---------------------------------------------------
// Helpers
// ---------------------------------------------------
function formatAUD(n) {
  if (isNaN(n)) n = 0;
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
}

// Totals grouped by category (using Sam Ledger data only)
function computeActualsByCategory() {
  const map = {};

  (stateSB.samLedger || []).forEach(tx => {
    if (!tx) return;

    const aud = tx.amountAud || 0;
    if (aud <= 0) return; // only expenses

    const cat = tx.category || 'Uncategorised';
    if (!map[cat]) map[cat] = 0;

    map[cat] += aud;
  });

  return map;
}

// ---------------------------------------------------
// Compute Summary
// ---------------------------------------------------
function computeTotals() {
    // Total budget excluding income categories
    const filteredBudget = stateSB.samBudgetCategories
        .filter(c => c.name !== "Income")
        .reduce((sum, c) => sum + (c.budgetMonthly || 0), 0);

    // Compute actual income + spent
    let incomeAUD = 0, spendAUD = 0;

    (stateSB.samLedger || []).forEach(tx => {
        const aud = tx.amountAud || 0;
        if (!tx.category) return;

        if (tx.category === "Income") incomeAUD += aud;
        else spendAUD += aud;
    });

    const profitLossAUD = incomeAUD - spendAUD;

    // Update UI
    elsSB.summaryIncome.textContent = formatAUD(incomeAUD);
    elsSB.summaryTotalBudget.textContent = formatAUD(filteredBudget);
    elsSB.summaryTotalSpend.textContent = formatAUD(spendAUD);
    elsSB.summaryProfitLoss.textContent = formatAUD(profitLossAUD);
}

// ---------------------------------------------------
// Render Categories Table
// ---------------------------------------------------
function renderCategories() {
  const actuals = computeActualsByCategory();
  elsSB.catBody.innerHTML = '';

  const sorted = [...stateSB.samBudgetCategories].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  sorted.forEach(cat => {
    const idx = stateSB.samBudgetCategories.findIndex(c => c.name === cat.name);
    if (idx === -1) return;

    const tr = document.createElement('tr');

    // Category Name
    const tdName = document.createElement('td');
    tdName.textContent = cat.name;
    tr.appendChild(tdName);

    // Budget (AUD)
    const tdBudget = document.createElement('td');
    tdBudget.className = 'amount';

    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
    input.value = cat.budgetMonthly || 0;
    input.style.width = '90px';

    input.oninput = () => {
      stateSB.samBudgetCategories[idx].budgetMonthly = parseFloat(input.value) || 0;
      State.save(stateSB);
    };

    input.onblur = () => {
      State.save(stateSB);
      renderCategories();
      computeTotals();
    };

    tdBudget.appendChild(input);
    tr.appendChild(tdBudget);

    // Actual Spend (AUD)
    const actualAud = actuals[cat.name] || 0;
    const tdActual = document.createElement('td');
    tdActual.className = 'amount';
    tdActual.textContent = formatAUD(actualAud);
    tr.appendChild(tdActual);

    // Difference
    const diff = (cat.budgetMonthly || 0) - actualAud;
    const tdDiff = document.createElement('td');
    tdDiff.className = 'amount';
    tdDiff.textContent = formatAUD(diff);
    tr.appendChild(tdDiff);

    // Status
    const tdStatus = document.createElement('td');
    if (cat.budgetMonthly == null) {
      tdStatus.textContent = 'No budget';
      tdStatus.className = 'status-neutral';
    } else if (diff >= 0) {
      tdStatus.textContent = 'Under Budget';
      tdStatus.className = 'status-positive';
    } else {
      tdStatus.textContent = 'Over Budget';
      tdStatus.className = 'status-negative';
    }
    tr.appendChild(tdStatus);

    // Delete category
    const tdActions = document.createElement('td');
    const btnDel = document.createElement('button');
    btnDel.textContent = '✕';
    btnDel.className = 'secondary';

    btnDel.onclick = () => {
      if (!confirm(`Delete category "${cat.name}" from Sam Budget?`)) return;
      const realIndex = stateSB.samBudgetCategories.findIndex(c => c.name === cat.name);
      if (realIndex !== -1) {
        stateSB.samBudgetCategories.splice(realIndex, 1);
        State.save(stateSB);
        renderCategories();
        computeTotals();
      }
    };

    tdActions.appendChild(btnDel);
    tr.appendChild(tdActions);

    elsSB.catBody.appendChild(tr);
  });
}

// ---------------------------------------------------
// Add Category
// ---------------------------------------------------
function addCategory() {
  const name = (elsSB.newCategoryName.value || '').trim();
  const monthly = parseFloat(elsSB.newCategoryMonthly.value) || 0;

  if (!name) return alert('Enter a category name.');

  if (stateSB.samBudgetCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    return alert('Category already exists.');
  }

  stateSB.samBudgetCategories.push({
    name,
    budgetMonthly: monthly
  });

  State.save(stateSB);

  elsSB.newCategoryName.value = '';
  elsSB.newCategoryMonthly.value = '';

  renderCategories();
  computeTotals();
}

// ---------------------------------------------------
// Backup (Sam budget only)
// ---------------------------------------------------
function downloadBackup() {
  const payload = {
    samBudgetCategories: stateSB.samBudgetCategories
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'sam-budget-backup.json';
  a.click();
}

function triggerLoadBackup() {
  elsSB.loadBackupInput.click();
}

function handleBackupFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);

      if (Array.isArray(parsed.samBudgetCategories)) {
        stateSB.samBudgetCategories = parsed.samBudgetCategories.map(c => ({
          name: c.name,
          budgetMonthly: c.budgetMonthly || 0
        }));
        State.save(stateSB);
        renderCategories();
        computeTotals();
        alert('Sam Budget backup restored.');
      } else {
        alert('Backup file does not contain samBudgetCategories.');
      }
    } catch {
      alert('Invalid backup file.');
    }
  };

  reader.readAsText(file);
}

// ---------------------------------------------------
// Init
// ---------------------------------------------------
function initSamBudget() {
  renderCategories();
  computeTotals();

  if (elsSB.addCategoryBtn) elsSB.addCategoryBtn.onclick = addCategory;

  if (elsSB.saveBackupBtn) elsSB.saveBackupBtn.onclick = downloadBackup;
  if (elsSB.loadBackupBtn) elsSB.loadBackupBtn.onclick = triggerLoadBackup;
  if (elsSB.loadBackupInput) elsSB.loadBackupInput.onchange = handleBackupFileChange;

  if (elsSB.refreshBtn) {
    elsSB.refreshBtn.onclick = () => {
      stateSB = State.load();
      renderCategories();
      computeTotals();
    };
  }

  if (elsSB.newCategoryName) {
    elsSB.newCategoryName.onkeydown = e => {
      if (e.key === 'Enter') addCategory();
    };
  }
  if (elsSB.newCategoryMonthly) {
    elsSB.newCategoryMonthly.onkeydown = e => {
      if (e.key === 'Enter') addCategory();
    };
  }
}

document.addEventListener('DOMContentLoaded', initSamBudget);
