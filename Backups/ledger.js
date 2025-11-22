// ===============================
// ledger.js (STABLE WORKING VERSION)
// Includes:
//  • Safe normalisation
//  • Income rule
//  • Negative rule for expenses
//  • Safe rendering (no crashes)
//  • Date sorting
// ===============================

// Load shared state
let state = State.load();
State.save(state);

// Ensure required arrays exist
if (!Array.isArray(state.ledger)) state.ledger = [];
if (!Array.isArray(state.categories)) state.categories = [];

// Safe normalisation for the entire ledger
function normaliseLedgerAmounts() {
  state.ledger = state.ledger.map(row => {
    if (!row || typeof row !== "object") return row;

    let category = row.category || "";
    let amount = parseFloat(row.amount);

    if (isNaN(amount)) amount = 0;

    // INCOME should always be positive
    if (category.toLowerCase() === "income") {
      amount = Math.abs(amount);
    }
    // EXPENSE should always be negative
    else {
      amount = -Math.abs(amount);
    }

    return { ...row, amount };
  });

  State.save(state);
}

// Elements
const el = {
  income: document.getElementById('income'),
  housePct: document.getElementById('housePct'),
  housePctLabel: document.getElementById('housePctLabel'),
  samalPct: document.getElementById('samalPct'),
  samalPctLabel: document.getElementById('samalPctLabel'),

  csvFile: document.getElementById('csvFile'),
  importBtn: document.getElementById('importBtn'),
  clearLedgerBtn: document.getElementById('clearLedgerBtn'),
  loader: document.getElementById('loader'),

  manualDate: document.getElementById('manualDate'),
  manualDescription: document.getElementById('manualDescription'),
  manualAmount: document.getElementById('manualAmount'),
  manualCategory: document.getElementById('manualCategory'),
  addManualBtn: document.getElementById('addManualBtn'),

  ledgerBody: document.querySelector('#ledger tbody'),
  ledgerSearch: document.getElementById('ledgerSearch')
};

// Summary update
function updateSummary() {
  if (!el.income || !el.housePct || !el.samalPct) return;

  el.housePctLabel.textContent = `${el.housePct.value}% of ${el.income.value}`;
  el.samalPctLabel.textContent = `${el.samalPct.value}% of ${el.income.value}`;
}

// ===============================
// Render Ledger
// ===============================
function renderLedger() {
  normaliseLedgerAmounts(); // <-- IMPORTANT

  const search = el.ledgerSearch.value.trim().toLowerCase();

  // Sort by date DESC
  state.ledger.sort((a, b) => new Date(b.date) - new Date(a.date));

  el.ledgerBody.innerHTML = '';

  state.ledger.forEach((row, idx) => {
    if (!row) return;

    if (
      search &&
      !row.description?.toLowerCase().includes(search) &&
      !row.category?.toLowerCase().includes(search)
    ) {
      return;
    }

    const tr = document.createElement('tr');

    // Date
    const tdDate = document.createElement('td');
    tdDate.textContent = row.date || '';
    tr.appendChild(tdDate);

    // Description (editable)
    const tdDesc = document.createElement('td');
    const inputDesc = document.createElement('input');
    inputDesc.type = 'text';
    inputDesc.value = row.description || '';
    inputDesc.style.width = '95%';
    inputDesc.addEventListener('input', () => {
      row.description = inputDesc.value;
      State.save(state);
    });
    tdDesc.appendChild(inputDesc);
    tr.appendChild(tdDesc);

    // Category dropdown
    const tdCat = document.createElement('td');
    const selCat = document.createElement('select');

    state.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.name;
      opt.textContent = cat.name;
      if (row.category === cat.name) opt.selected = true;
      selCat.appendChild(opt);
    });

    selCat.addEventListener('change', () => {
      row.category = selCat.value;
      normaliseLedgerAmounts();
      renderLedger();
    });

    tdCat.appendChild(selCat);
    tr.appendChild(tdCat);

    // Amount
    const tdAmt = document.createElement('td');
    const inputAmt = document.createElement('input');
    inputAmt.type = 'number';
    inputAmt.step = '0.01';
    inputAmt.value = row.amount || 0;
    inputAmt.style.width = '100px';
    inputAmt.addEventListener('input', () => {
      row.amount = parseFloat(inputAmt.value) || 0;
      normaliseLedgerAmounts();
      renderLedger();
    });
    tdAmt.appendChild(inputAmt);
    tr.appendChild(tdAmt);

    // Delete button
    const tdDel = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.className = 'secondary';
    delBtn.onclick = () => {
      if (confirm('Delete this entry?')) {
        state.ledger.splice(idx, 1);
        State.save(state);
        renderLedger();
      }
    };
    tdDel.appendChild(delBtn);
    tr.appendChild(tdDel);

    el.ledgerBody.appendChild(tr);
  });
}

// ===============================
// Manual Entry
// ===============================
function addManualEntry() {
  const date = el.manualDate.value;
  const desc = el.manualDescription.value.trim();
  const category = el.manualCategory.value;
  let amount = parseFloat(el.manualAmount.value);

  if (!date || !desc || isNaN(amount)) {
    alert('Please enter date, description and amount.');
    return;
  }

  const row = { date, description: desc, category, amount };
  state.ledger.push(row);

  normaliseLedgerAmounts();
  State.save(state);
  renderLedger();

  el.manualDescription.value = '';
  el.manualAmount.value = '';
}

// ===============================
// CSV Import
// ===============================
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 4) continue;

    const date = cols[0];
    const desc = cols[1];
    const category = cols[2];
    let amount = parseFloat(cols[3]) || 0;

    rows.push({ date, description: desc, category, amount });
  }

  return rows;
}

function importCsv() {
  const file = el.csvFile.files[0];
  if (!file) {
    alert('Select a CSV file first.');
    return;
  }

  el.loader.classList.remove('hidden');

  const reader = new FileReader();
  reader.onload = e => {
    const newRows = parseCsv(e.target.result);
    state.ledger.push(...newRows);
    normaliseLedgerAmounts();
    State.save(state);
    renderLedger();
    el.loader.classList.add('hidden');
  };
  reader.readAsText(file);
}

// ===============================
// Clear Ledger
// ===============================
function clearLedger() {
  if (!confirm('Clear the entire ledger?')) return;
  state.ledger = [];
  State.save(state);
  renderLedger();
}

// ===============================
// Event Listeners
// ===============================
el.addManualBtn.addEventListener('click', addManualEntry);
el.importBtn.addEventListener('click', importCsv);
el.clearLedgerBtn.addEventListener('click', clearLedger);
el.ledgerSearch.addEventListener('input', renderLedger);

el.income?.addEventListener('input', updateSummary);
el.housePct?.addEventListener('input', updateSummary);
el.samalPct?.addEventListener('input', updateSummary);

// Init
updateSummary();
renderLedger();


