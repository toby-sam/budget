// philippines.js – complete corrected version using shared state.js only

let stateP = State.load();   // unified global state

// Ensure required structures exist
if (!Array.isArray(stateP.philippines)) stateP.philippines = [];
if (!Array.isArray(stateP.phCategories)) stateP.phCategories = [];
if (typeof stateP.phpAudRate !== 'number' || stateP.phpAudRate <= 0) {
  stateP.phpAudRate = 0.0259; // default fallback rate
  State.save(stateP);
}

const elsP = {
  date: document.getElementById('phDate'),
  desc: document.getElementById('phDesc'),
  amount: document.getElementById('phAmount'),
  category: document.getElementById('phCategory'),
  addBtn: document.getElementById('addPhBtn'),
  newCat: document.getElementById('newPhCategory'),
  addCatBtn: document.getElementById('addPhCategoryBtn'),

  tableBody: document.getElementById('phTableBody'),

  rateInput: document.getElementById('phRateInput'),
  rateDisplay: document.getElementById('phRateDisplay'),
  rateNote: document.getElementById('phRateNote'),

  csvFile: document.getElementById('phCsvFile'),
  importBtn: document.getElementById('importPhCsvBtn'),
  exportBtn: document.getElementById('exportPhCsvBtn')
};

/* ------------------------------
   Helpers
------------------------------ */

function parseMoney(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function splitCsvLine(line) {
  const match = line.match(/(".*?"|[^,]+)/g);
  if (!match) return [];
  return match.map(col => {
    col = col.trim();
    if (col.startsWith('"') && col.endsWith('"')) col = col.slice(1, -1);
    return col;
  });
}

function normalisePhDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  const day = String(d.getDate()).padStart(2, '0');
  const months = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatPHP(n) {
  return n.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
}

function formatAUD(n) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
}

/* ------------------------------
   Export CSV
------------------------------ */

function exportPhilippinesCsv() {
  if (!stateP.philippines.length) {
    alert("No Philippines transactions to export.");
    return;
  }

  let csv = "Date,Description,Category,AmountPHP,AmountAUD\n";

  stateP.philippines.forEach(r => {
    const date = r.date || "";
    const desc = (r.reason || "").replace(/"/g, '""');
    const cat = r.category || "";
    const php = r.amountPhp ?? "";
    const aud = r.amountAud ?? r.amount ?? "";

    csv += `"${date}","${desc}","${cat}",${php},${aud}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "philippines_export.csv";
  a.click();

  URL.revokeObjectURL(url);
}

/* ------------------------------
   Categories
------------------------------ */

function populateCategoryDropdown() {
  const list = elsP.category;
  if (!list) return;

  list.innerHTML = '';
  stateP.phCategories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    list.appendChild(opt);
  });
}

function addNewPhCategory() {
  const v = elsP.newCat.value.trim();
  if (!v) return;

  if (!stateP.phCategories.includes(v)) {
    stateP.phCategories.push(v);
  }

  State.save(stateP);
  populateCategoryDropdown();
  renderRows();

  elsP.newCat.value = '';
}

/* ------------------------------
   Totals
------------------------------ */

function computeTotalPHP() {
  return (stateP.philippines || [])
    .reduce((sum, r) => sum + (r.amountPhp ?? 0), 0);
}

function computeTotalAUD() {
  return (stateP.philippines || [])
    .reduce((sum, r) => sum + (r.amountAud ?? r.amount ?? 0), 0);
}

/* ------------------------------
   PH Metrics (Transfers, Income, Expenses, Net, Remaining)
------------------------------ */

function computePhilippinesMetrics() {
  const rows = stateP.philippines || [];

  let phIncome = 0;
  let phExpenses = 0;

  rows.forEach(r => {
    if (!r) return;
    let amt = 0;
    if (typeof r.amountAud === 'number') {
      amt = r.amountAud;
    } else if (typeof r.amount === 'number') {
      amt = r.amount;
    } else {
      amt = parseFloat(r.amountAud ?? r.amount ?? 0) || 0;
    }

    if (amt > 0) phIncome += amt;
    else if (amt < 0) phExpenses += Math.abs(amt);
  });

  // Transfers from AU ledger (category "Philippines")
  let phTransfers = 0;
  (stateP.ledger || []).forEach(tx => {
    if (!tx) return;
    const cat = (tx.category || '').toLowerCase();
    if (cat === 'philippines') {
      const amt = typeof tx.amount === "number"
        ? tx.amount
        : parseFloat(tx.amount) || 0;
      phTransfers += Math.abs(amt);
    }
  });

  const phNetResult = phIncome - phExpenses;
  const phRemaining = phTransfers + phNetResult;

  return {
    transfers: phTransfers,
    income: phIncome,
    expenses: phExpenses,
    netResult: phNetResult,
    remaining: phRemaining
  };
}

/* ------------------------------
   Table Rendering
------------------------------ */

function renderRows() {
  elsP.tableBody.innerHTML = '';

  const rows = stateP.philippines || [];

  const sorted = [...rows].sort((a, b) => {
    const da = new Date(a.date);
    const db = new Date(b.date);
    if (isNaN(da) || isNaN(db)) return 0;
    return db - da;
  });

  sorted.forEach((row, idx) => {
    const tr = document.createElement('tr');

    // Date
    const tdDate = document.createElement('td');
    tdDate.textContent = row.date || '';
    tr.appendChild(tdDate);

    // Description input
    const tdDesc = document.createElement('td');
    const inputDesc = document.createElement('input');
    inputDesc.type = 'text';
    inputDesc.value = row.reason || '';
    inputDesc.style.width = '95%';

    inputDesc.addEventListener('input', () => {
      row.reason = inputDesc.value;
      State.save(stateP);
    });

    tdDesc.appendChild(inputDesc);
    tr.appendChild(tdDesc);

    // Category dropdown
    const tdCat = document.createElement('td');
    const sel = document.createElement('select');

    stateP.phCategories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (row.category === cat) opt.selected = true;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', () => {
      row.category = sel.value;
      State.save(stateP);
    });

    tdCat.appendChild(sel);
    tr.appendChild(tdCat);

    // PHP editable
    const tdPhp = document.createElement('td');
    tdPhp.className = 'amount';
    const inputPhp = document.createElement('input');
    inputPhp.type = 'text';
    inputPhp.style.width = '100px';
    const phpVal = row.amountPhp ?? 0;
    inputPhp.value = phpVal.toLocaleString('en-PH');

    inputPhp.addEventListener('input', () => {
      const raw = inputPhp.value.replace(/,/g, '');
      const val = parseFloat(raw) || 0;

      row.amountPhp = val;
      row.amountAud = val * stateP.phpAudRate;

      State.save(stateP);
      renderRows();
    });

    tdPhp.appendChild(inputPhp);
    tr.appendChild(tdPhp);

    // AUD computed
    const tdAud = document.createElement('td');
    tdAud.textContent = formatAUD(row.amountAud ?? 0);
    tdAud.className = 'amount';
    tr.appendChild(tdAud);

    // Delete button
    const tdDel = document.createElement('td');
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.className = 'secondary';

    btn.onclick = () => {
      stateP.philippines.splice(idx, 1);
      State.save(stateP);
      renderRows();
    };

    tdDel.appendChild(btn);
    tr.appendChild(tdDel);

    elsP.tableBody.appendChild(tr);
  });

  renderSummary();
}

/* ------------------------------
   Summary
------------------------------ */

function renderSummary() {
  const metrics = computePhilippinesMetrics();
  const totalPHP = computeTotalPHP();
  const totalAUD = computeTotalAUD();

  const sentEl = document.getElementById('phSentFromAu');
  const incomeEl = document.getElementById('phIncome');
  const expensesEl = document.getElementById('phExpenses');
  const netEl = document.getElementById('phNetResult');
  const remainEl = document.getElementById('phRemaining');

  if (sentEl) sentEl.textContent = formatAUD(metrics.transfers);
  if (incomeEl) incomeEl.textContent = formatAUD(metrics.income);
  if (expensesEl) expensesEl.textContent = formatAUD(metrics.expenses);
  if (netEl) netEl.textContent = formatAUD(metrics.netResult);
  if (remainEl) remainEl.textContent = formatAUD(metrics.remaining);

  document.getElementById('phTotalPHP').textContent = formatPHP(Math.abs(totalPHP));
  document.getElementById('phTotalAUD').textContent = formatAUD(Math.abs(totalAUD));
}

/* ------------------------------
   CSV Import – FIXED FOR BDO FORMAT
------------------------------ */

function parsePhilippinesCsv(text, rate) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  const rows = [];

  lines.forEach((line, idx) => {
    const cols = splitCsvLine(line);
    if (!cols.length) return;
    if (idx === 0) return;

    // BDO correct column mapping:
    const amountStr = cols[2] || '';          // Amount (PHP)
    const cd = (cols[3] || '').toLowerCase(); // Debit/Credit
    const bookDate = cols[4] || '';           // Book date
    const desc = cols[11] || 'PH transaction';

    let phpAmount = parseMoney(amountStr);

    // Debit = money OUT → negative
    if (cd === 'debit') phpAmount = -Math.abs(phpAmount);
    else phpAmount = Math.abs(phpAmount);

    const aud = phpAmount * rate;

    rows.push({
      date: normalisePhDate(bookDate),
      reason: desc,
      amountPhp: phpAmount,
      amountAud: aud,
      category: ''
    });
  });

  return rows;
}

function importPhilippinesCsv() {
  setRateFromInput();
  const rate = stateP.phpAudRate;

  const file = elsP.csvFile.files[0];
  if (!file) {
    alert('Please choose a CSV file first.');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const newRows = parsePhilippinesCsv(e.target.result, rate);
    if (!newRows.length) {
      alert('No transactions detected — check column positions.');
      return;
    }

    stateP.philippines.push(...newRows);
    State.save(stateP);
    renderRows();
  };

  reader.readAsText(file);
}

/* ------------------------------
   Exchange Rate
------------------------------ */

function setRateFromInput() {
  const v = parseFloat(elsP.rateInput.value);
  if (v > 0) stateP.phpAudRate = v;
  State.save(stateP);
}

function updateRateUI() {
  const r = stateP.phpAudRate;
  elsP.rateInput.value = r.toFixed(4);
  elsP.rateDisplay.textContent = `1 PHP = ${r.toFixed(4)} AUD`;
  elsP.rateNote.textContent = 'Auto-loaded; you can edit this.';
}

/* ------------------------------
   Init
------------------------------ */

function init() {
  populateCategoryDropdown();
  updateRateUI();
  renderRows();
  renderSummary();

  elsP.addBtn.onclick = () => {
    const date = elsP.date.value;
    const desc = elsP.desc.value.trim();
    const amt = parseFloat(elsP.amount.value);
    const cat = elsP.category.value;

    if (!desc || isNaN(amt)) {
      alert('Enter description and amount.');
      return;
    }

    stateP.philippines.push({
      date,
      reason: desc,
      amountPhp: amt,
      amountAud: amt * stateP.phpAudRate,
      category: cat
    });

    State.save(stateP);
    renderRows();

    elsP.desc.value = '';
    elsP.amount.value = '';
  };

  elsP.addCatBtn.onclick = addNewPhCategory;
  elsP.importBtn.onclick = importPhilippinesCsv;
  elsP.exportBtn.onclick = exportPhilippinesCsv;
}

document.addEventListener('DOMContentLoaded', init);
