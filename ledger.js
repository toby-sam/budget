// ===============================
// ledger.js (FIXED VERSION)
// Fully compatible with state.js
// Standard Ledger: Date, Description, Category, Amount, Delete
// ===============================

// Load shared global state
let state = State.load();
State.save(state); // ensures any missing fields are added

// Make sure required arrays exist
if (!Array.isArray(state.ledger)) state.ledger = [];
if (!Array.isArray(state.categories)) state.categories = [];

// Element references
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

// ------------------------------
// Summary Updates (house/samal)
// ------------------------------
function updateSummary() {
  if (!el.income || !el.housePct || !el.samalPct) return;

  el.housePctLabel.textContent = `${el.housePct.value}% of ${el.income.value}`;
  el.samalPctLabel.textContent = `${el.samalPct.value}% of ${el.income.value}`;
}

// ------------------------------
// Render Ledger Table
// ------------------------------
function renderLedger() {
  const search = el.ledgerSearch.value.trim().toLowerCase();

  // use a sorted copy (newest → oldest)
  const rows = [...state.ledger].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  el.ledgerBody.innerHTML = '';

  rows.forEach((row) => {
    const descLC = (row.description || '').toLowerCase();
    const catLC = (row.category || '').toLowerCase();

    if (
      search &&
      !descLC.includes(search) &&
      !catLC.includes(search)
    ) {
      return;
    }

    const tr = document.createElement('tr');

    // Date
    const tdDate = document.createElement('td');
    tdDate.textContent = row.date;
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

    // Category (dropdown)
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
      State.save(state);
    });

    tdCat.appendChild(selCat);
    tr.appendChild(tdCat);

    // Amount
    const tdAmt = document.createElement('td');
    const inputAmt = document.createElement('input');
    inputAmt.type = 'number';
    inputAmt.step = '0.01';
    inputAmt.value = row.amount ?? 0;
    inputAmt.style.width = '100px';

    inputAmt.addEventListener('input', () => {
      let amt = parseFloat(inputAmt.value) || 0;

      // Auto-negative for all non-income categories
      const catName = (row.category || "").toLowerCase();
      if (catName !== "income") {
        if (amt > 0) amt = -amt;
      }

      row.amount = amt;
      inputAmt.value = amt;   // reflect corrected negative amount
      State.save(state);
    });

    tdAmt.appendChild(inputAmt);
    tr.appendChild(tdAmt);

    // Delete
    const tdDel = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.className = 'secondary';
    delBtn.onclick = () => {
      if (!confirm('Delete this entry?')) return;

      const realIndex = state.ledger.indexOf(row);
      if (realIndex !== -1) {
        state.ledger.splice(realIndex, 1);
        State.save(state);
        renderLedger();
      }
    };
    tdDel.appendChild(delBtn);
    tr.appendChild(tdDel);

    el.ledgerBody.appendChild(tr);
  });
}

// ------------------------------
// Add manual ledger entry
// ------------------------------
function addManualEntry() {
  const date = el.manualDate.value;
  const desc = el.manualDescription.value.trim();
  const amount = parseFloat(el.manualAmount.value);
  const category = el.manualCategory.value;

  if (!date || !desc || isNaN(amount)) {
    alert('Please enter date, description and amount.');
    return;
  }

  state.ledger.push({
    date,
    description: desc,
    category,
    amount
  });

  State.save(state);
  renderLedger();

  el.manualDescription.value = '';
  el.manualAmount.value = '';
}

// ------------------------------
// CSV Import
// ------------------------------
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 4) continue;

    const date = cols[0];
    const desc = cols[1];
    const category = cols[2];
    const amount = parseFloat(cols[3]) || 0;

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
    State.save(state);
    renderLedger();
    el.loader.classList.add('hidden');
  };
  reader.readAsText(file);
}

// ------------------------------
// CSV Export
// ------------------------------
function exportCsv() {
  if (!state.ledger.length) {
    alert("Ledger is empty — nothing to export.");
    return;
  }

  // CSV header
  let csv = "Date,Description,Category,Amount\n";

  // Add rows
  state.ledger.forEach(row => {
    const date = row.date || "";
    const desc = (row.description || "").replace(/"/g, '""'); // escape quotes
    const cat = row.category || "";
    const amt = row.amount ?? "";

    csv += `"${date}","${desc}","${cat}",${amt}\n`;
  });

  // Create blob
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  // Download link
  const a = document.createElement("a");
  a.href = url;
  a.download = "ledger_export.csv";
  a.click();

  URL.revokeObjectURL(url);
}

// ------------------------------
// Clear ledger
// ------------------------------
function clearLedger() {
  if (!confirm('Clear the entire ledger?')) return;
  state.ledger = [];
  State.save(state);
  renderLedger();
}

// ------------------------------
// Event Wiring
// ------------------------------
el.addManualBtn.addEventListener('click', addManualEntry);
el.importBtn.addEventListener('click', importCsv);
el.clearLedgerBtn.addEventListener('click', clearLedger);
el.ledgerSearch.addEventListener('input', renderLedger);

// FIXED: export button wired in correct place
document.getElementById("exportBtn").addEventListener("click", exportCsv);

el.income?.addEventListener('input', updateSummary);
el.housePct?.addEventListener('input', updateSummary);
el.samalPct?.addEventListener('input', updateSummary);

// ------------------------------
// Initial render
// ------------------------------
updateSummary();
renderLedger();
