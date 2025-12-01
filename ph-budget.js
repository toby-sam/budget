// updated 1-Dec forcing refresh



// =============================================
// ph-budget.js – FINAL, SAFE, SEPARATED VERSION
// =============================================

let stateB = State.load();
// Stop PH script from running on AU budget page


// Ensure PH Budget categories list exists
if (!Array.isArray(stateB.phBudgetCategories)) {
  stateB.phBudgetCategories = [];
}

// Normalise any legacy entries (strings → objects)
stateB.phBudgetCategories = stateB.phBudgetCategories.map(c => {
  if (typeof c === 'string') return { name: c, budgetMonthly: 0 };
  if (!c || !c.name) return { name: String(c), budgetMonthly: 0 };
  return {
    name: c.name,
    budgetMonthly: c.budgetMonthly || 0
  };
});

State.save(stateB);

// ---------------------------------------------------
// Element references
// ---------------------------------------------------
const elsPH = {
  summaryIncome: document.getElementById('summaryIncome'),
  summaryHouse: document.getElementById('summaryHouse'),
  summarySamal: document.getElementById('summarySamal'),
  summaryTotalSpend: document.getElementById('summaryTotalSpend'),
  summaryProfitLoss: document.getElementById('summaryProfitLoss'),

  summaryTotalBudget: document.getElementById('summaryTotalBudget'),
  summaryLedger: document.getElementById('summaryLedger'),
  summaryPhilippines: document.getElementById('summaryPhilippines'),

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
function formatPHP(n) {
  if (isNaN(n)) n = 0;
  return n.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
}

// Totals grouped by category (using PH Ledger data only)
function computeActualsByCategory() {
  const map = {};

  (stateB.philippines || []).forEach(tx => {
    if (!tx) return;

    const php = tx.amountPhp || 0;
    if (php <= 0) return; // only expenses

    const cat = tx.category || 'Uncategorised';
    if (!map[cat]) map[cat] = 0;

    map[cat] += php;
  });

  return map;
}

// ---------------------------------------------------
// Compute Summary
// ---------------------------------------------------
function computeTotals() {
  let totalLedgerPhp = 0;

  (stateB.philippines || []).forEach(tx => {
    const php = tx.amountPhp || 0;
    if (php > 0) totalLedgerPhp += php;
  });

  if (elsPH.summaryLedger) {
    elsPH.summaryLedger.textContent = formatPHP(totalLedgerPhp);
  }

  const totalBudgetPhp = stateB.phBudgetCategories.reduce(
    (sum, c) => sum + (c.budgetMonthly || 0),
    0
  );

  if (elsPH.summaryTotalBudget) {
    elsPH.summaryTotalBudget.textContent = formatPHP(totalBudgetPhp);
  }

  if (elsPH.summaryPhilippines) {
    // For now PH Net Spend = total ledger PHP spend
    elsPH.summaryPhilippines.textContent = formatPHP(totalLedgerPhp);
  }
}

// ---------------------------------------------------
// Render Categories Table
// ---------------------------------------------------
function renderCategories() {
  const actuals = computeActualsByCategory();
  elsPH.catBody.innerHTML = '';

  const sorted = [...stateB.phBudgetCategories].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  sorted.forEach(cat => {
    const idx = stateB.phBudgetCategories.findIndex(c => c.name === cat.name);
    if (idx === -1) return;

    const tr = document.createElement('tr');

    // Category Name
    const tdName = document.createElement('td');
    tdName.textContent = cat.name;
    tr.appendChild(tdName);

    // Budget (PHP)
    const tdBudget = document.createElement('td');
    tdBudget.className = 'amount';

    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
    input.value = cat.budgetMonthly || 0;
    input.style.width = '90px';

    input.oninput = () => {
      stateB.phBudgetCategories[idx].budgetMonthly = parseFloat(input.value) || 0;
      State.save(stateB);
    };

    input.onblur = () => {
      State.save(stateB);
      renderCategories();
      computeTotals();
    };

    tdBudget.appendChild(input);
    tr.appendChild(tdBudget);

    // Actual Spend (PHP)
    const actualPhp = actuals[cat.name] || 0;
    const tdActual = document.createElement('td');
    tdActual.className = 'amount';
    tdActual.textContent = formatPHP(actualPhp);
    tr.appendChild(tdActual);

    // Difference
    const diff = (cat.budgetMonthly || 0) - actualPhp;
    const tdDiff = document.createElement('td');
    tdDiff.className = 'amount';
    tdDiff.textContent = formatPHP(diff);
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
      if (!confirm(`Delete category "${cat.name}" from PH Budget?`)) return;
      const realIndex = stateB.phBudgetCategories.findIndex(c => c.name === cat.name);
      if (realIndex !== -1) {
        stateB.phBudgetCategories.splice(realIndex, 1);
        State.save(stateB);
        renderCategories();
        computeTotals();
      }
    };

    tdActions.appendChild(btnDel);
    tr.appendChild(tdActions);

    elsPH.catBody.appendChild(tr);
  });
}

// ---------------------------------------------------
// Add Category
// ---------------------------------------------------
function addCategory() {
  const name = (elsPH.newCategoryName.value || '').trim();
  const monthly = parseFloat(elsPH.newCategoryMonthly.value) || 0;

  if (!name) return alert('Enter a category name.');

  if (stateB.phBudgetCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    return alert('Category already exists.');
  }

  stateB.phBudgetCategories.push({
    name,
    budgetMonthly: monthly
  });

  State.save(stateB);

  elsPH.newCategoryName.value = '';
  elsPH.newCategoryMonthly.value = '';

  renderCategories();
  computeTotals();
}

// ---------------------------------------------------
// Backup (PH budget only)
// ---------------------------------------------------
function downloadBackup() {
  // Only export the PH budget section, to avoid overwriting whole state
  const payload = {
    phBudgetCategories: stateB.phBudgetCategories
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ph-budget-only-backup.json';
  a.click();
}

function triggerLoadBackup() {
  elsPH.loadBackupInput.click();
}

function handleBackupFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);

      if (Array.isArray(parsed.phBudgetCategories)) {
        stateB.phBudgetCategories = parsed.phBudgetCategories.map(c => ({
          name: c.name,
          budgetMonthly: c.budgetMonthly || 0
        }));
        State.save(stateB);
        renderCategories();
        computeTotals();
        alert('PH Budget backup restored.');
      } else {
        alert('Backup file does not contain phBudgetCategories.');
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
function initPhBudget() {
  renderCategories();
  computeTotals();

  if (elsPH.addCategoryBtn) elsPH.addCategoryBtn.onclick = addCategory;

  if (elsPH.saveBackupBtn) elsPH.saveBackupBtn.onclick = downloadBackup;
  if (elsPH.loadBackupBtn) elsPH.loadBackupBtn.onclick = triggerLoadBackup;
  if (elsPH.loadBackupInput) elsPH.loadBackupInput.onchange = handleBackupFileChange;

  if (elsPH.refreshBtn) {
    elsPH.refreshBtn.onclick = () => {
      // reload from storage in case another tab changed it
      stateB = State.load();
      renderCategories();
      computeTotals();
    };
  }

  if (elsPH.newCategoryName) {
    elsPH.newCategoryName.onkeydown = e => {
      if (e.key === 'Enter') addCategory();
    };
  }
  if (elsPH.newCategoryMonthly) {
    elsPH.newCategoryMonthly.onkeydown = e => {
      if (e.key === 'Enter') addCategory();
    };
  }
}

document.addEventListener('DOMContentLoaded', initPhBudget);
