// updated 1-Dec forcing refresh



// =============================================
// Solect-budget.js – FINAL, SAFE, SEPARATED VERSION
// =============================================

let stateB = State.load();
// Stop Solect script from running on AU budget page


// Ensure Solect Budget categories list exists
if (!Array.isArray(stateB.solectBudgetCategories)) {
  stateB.solectBudgetCategories = [];
}

// Manual monthly budget (single editable value)
if (typeof stateB.solectMonthlyBudget !== 'number') {
  stateB.solectMonthlyBudget = 0;
}

// Normalise any legacy entries (strings → objects)
stateB.solectBudgetCategories = stateB.solectBudgetCategories.map(c => {
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
const elsSolect = {
  manualMonthlyBudget: document.getElementById('manualMonthlyBudget'),
  summaryHouse: document.getElementById('summaryHouse'),
  summarySamal: document.getElementById('summarySamal'),
  summaryTotalSpend: document.getElementById('summaryTotalSpend'),
  summaryProfitLoss: document.getElementById('summaryProfitLoss'),
  summaryProfitLossAud: document.getElementById('summaryProfitLossAud'),

  summaryTotalBudget: document.getElementById('summaryTotalBudget'),
  summaryTotalBudgetAud: document.getElementById('summaryTotalBudgetAud'),
  summaryLedger: document.getElementById('summaryLedger'),
  summarysolect: document.getElementById('summarysolect'),

  newCategoryName: document.getElementById('newCategoryName'),
  newCategoryMonthly: document.getElementById('newCategoryMonthly'),
  addCategoryBtn: document.getElementById('addCategoryBtn'),

  catBody: document.querySelector('#categoriesTable tbody'),

  refreshBtn: document.getElementById('refreshBtn')
};

// ---------------------------------------------------
// Helpers
// ---------------------------------------------------
function formatSOL(n) {
  if (isNaN(n)) n = 0;
  return n.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
}

function formatAUD(n) {
  if (isNaN(n)) n = 0;
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
}

// Totals grouped by category (using Solect Ledger data only)
function computeActualsByCategory() {
  const map = {};

  (stateB.solect || []).forEach(tx => {
    if (!tx) return;

    const SOL = tx.amountSOL || 0;
    if (SOL <= 0) return; // only expenses

    const cat = tx.category || 'Uncategorised';
    if (!map[cat]) map[cat] = 0;

    map[cat] += SOL;
  });

  return map;
}

// ---------------------------------------------------
// Compute Summary
// ---------------------------------------------------
function computeTotals() {

    // 🔹 Total category budget excluding income categories
    const filteredBudget = stateB.solectBudgetCategories
        .filter(c => c.name !== "AU_Income" && c.name !== "Income")
        .reduce((sum, c) => sum + (c.budgetMonthly || 0), 0);

    // 🔹 Compute spend (income categories excluded)
    let spendSOL = 0;

    (stateB.solect || []).forEach(tx => {
        const SOL = tx.amountSOL || 0;
        if (!tx.category) return;
        if (tx.category === "AU_Income" || tx.category === "Income") return;
        spendSOL += SOL;
    });

    const manualBudget = stateB.solectMonthlyBudget || 0;

    if (elsSolect.manualMonthlyBudget && document.activeElement !== elsSolect.manualMonthlyBudget) {
        elsSolect.manualMonthlyBudget.value = manualBudget;
    }

    const rate = stateB.solAudRate || 0.0259;
    const profitLoss = manualBudget - spendSOL;

    elsSolect.summaryTotalBudget.textContent = formatSOL(filteredBudget);

    elsSolect.summaryTotalSpend.textContent = formatSOL(spendSOL);

    // Profit/Loss = manual budget left after spend
    elsSolect.summaryProfitLoss.textContent = formatSOL(profitLoss);

    // AUD equivalents (converted at the Solect PHP→AUD rate)
    if (elsSolect.summaryProfitLossAud)
        elsSolect.summaryProfitLossAud.textContent = formatAUD(profitLoss * rate);
    if (elsSolect.summaryTotalBudgetAud)
        elsSolect.summaryTotalBudgetAud.textContent = formatAUD(filteredBudget * rate);

}


// ---------------------------------------------------
// Render Categories Table
// ---------------------------------------------------
function renderCategories() {
  const actuals = computeActualsByCategory();
  elsSolect.catBody.innerHTML = '';

  const sorted = [...stateB.solectBudgetCategories].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  sorted.forEach(cat => {
    const idx = stateB.solectBudgetCategories.findIndex(c => c.name === cat.name);
    if (idx === -1) return;

    const tr = document.createElement('tr');

    // Category Name
    const tdName = document.createElement('td');
    tdName.textContent = cat.name;
    tr.appendChild(tdName);

    // Budget (SOL)
    const tdBudget = document.createElement('td');
    tdBudget.className = 'amount';

    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
    input.value = cat.budgetMonthly || 0;
    input.style.width = '90px';

    input.oninput = () => {
      stateB.solectBudgetCategories[idx].budgetMonthly = parseFloat(input.value) || 0;
      State.save(stateB);
    };

    input.onblur = () => {
      State.save(stateB);
      renderCategories();
      computeTotals();
    };

    tdBudget.appendChild(input);
    tr.appendChild(tdBudget);

    // Actual Spend (SOL)
    const actualSOL = actuals[cat.name] || 0;
    const tdActual = document.createElement('td');
    tdActual.className = 'amount';
    tdActual.textContent = formatSOL(actualSOL);
    tr.appendChild(tdActual);

    // Difference
    const diff = (cat.budgetMonthly || 0) - actualSOL;
    const tdDiff = document.createElement('td');
    tdDiff.className = 'amount';
    tdDiff.textContent = formatSOL(diff);
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
      if (!confirm(`Delete category "${cat.name}" from Solect Budget?`)) return;
      const realIndex = stateB.solectBudgetCategories.findIndex(c => c.name === cat.name);
      if (realIndex !== -1) {
        stateB.solectBudgetCategories.splice(realIndex, 1);
        State.save(stateB);
        renderCategories();
        computeTotals();
      }
    };

    tdActions.appendChild(btnDel);
    tr.appendChild(tdActions);

    elsSolect.catBody.appendChild(tr);
  });
}

// ---------------------------------------------------
// Add Category
// ---------------------------------------------------
function addCategory() {
  const name = (elsSolect.newCategoryName.value || '').trim();
  const monthly = parseFloat(elsSolect.newCategoryMonthly.value) || 0;

  if (!name) return alert('Enter a category name.');

  if (stateB.solectBudgetCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    return alert('Category already exists.');
  }

  stateB.solectBudgetCategories.push({
    name,
    budgetMonthly: monthly
  });

  State.save(stateB);

  elsSolect.newCategoryName.value = '';
  elsSolect.newCategoryMonthly.value = '';

  renderCategories();
  computeTotals();
}

// ---------------------------------------------------
// Init
// ---------------------------------------------------
function initSolectBudget() {
  renderCategories();
  computeTotals();

  if (elsSolect.manualMonthlyBudget) {
    elsSolect.manualMonthlyBudget.value = stateB.solectMonthlyBudget || 0;
    elsSolect.manualMonthlyBudget.oninput = () => {
      stateB.solectMonthlyBudget = parseFloat(elsSolect.manualMonthlyBudget.value) || 0;
      State.save(stateB);
      computeTotals();
    };
  }

  if (elsSolect.addCategoryBtn) elsSolect.addCategoryBtn.onclick = addCategory;

  if (elsSolect.refreshBtn) {
    elsSolect.refreshBtn.onclick = () => {
      // reload from storage in case another tab changed it
      stateB = State.load();
      renderCategories();
      computeTotals();
    };
  }

  if (elsSolect.newCategoryName) {
    elsSolect.newCategoryName.onkeydown = e => {
      if (e.key === 'Enter') addCategory();
    };
  }
  if (elsSolect.newCategoryMonthly) {
    elsSolect.newCategoryMonthly.onkeydown = e => {
      if (e.key === 'Enter') addCategory();
    };
  }
}

document.addEventListener('DOMContentLoaded', initSolectBudget);
