// philippines.js – using shared state.js only

let stateP = State.load();   // unified global state

// Ensure required structures exist
if (!Array.isArray(stateP.philippines)) stateP.philippines = [];
if (!Array.isArray(stateP.phCategories)) stateP.phCategories = [];
if (typeof stateP.phpAudRate !== 'number' || stateP.phpAudRate <= 0) {
  stateP.phpAudRate = 0.0259; // default rate
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
  ledgerTotal: document.getElementById('phLedgerTotal'),
  detailTotal: document.getElementById('phDetailTotal'),
  difference: document.getElementById('phDifference'),

  rateInput: document.getElementById('phRateInput'),
  rateDisplay: document.getElementById('phRateDisplay'),
  rateNote: document.getElementById('phRateNote'),

  csvFile: document.getElementById('phCsvFile'),
  importBtn: document.getElementById('importPhCsvBtn')
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

/* ------------------------------
   Category Dropdown
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
function computeTotalPHP() {
  return (stateP.philippines || [])
    .reduce((sum, r) => sum + (r.amountPhp ?? 0), 0);
}

function computeTotalAUD() {
  return (stateP.philippines || [])
    .reduce((sum, r) => sum + (r.amountAud ?? r.amount ?? 0), 0);
}

/* ------------------------------
   Table Rendering
------------------------------ */

function renderRows() {
  elsP.tableBody.innerHTML = '';

  const rows = stateP.philippines || [];

  // 🔽 Sort by date – newest first
  const sorted = [...rows].sort((a, b) => {
    const da = new Date(a.date);
    const db = new Date(b.date);
    if (isNaN(da) || isNaN(db)) return 0;
    return db - da; // db > da => b before a (newest first)
  });

  sorted.forEach((row, idx) => {
    const tr = document.createElement('tr');
    // ... keep the rest of the function the same, but use `row` from sorted



    // Date
    const tdDate = document.createElement('td');
    tdDate.textContent = row.date || '';
    tr.appendChild(tdDate);



    // Description (editable)
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


    // Category
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

        // Amount PHP (editable, with commas)
    const tdPhp = document.createElement('td');
    tdPhp.className = 'amount';

    const inputPhp = document.createElement('input');
    inputPhp.type = 'text';           // text so we can show commas
    inputPhp.style.width = '100px';

    // Format number with commas (no currency symbol)
    const phpVal = row.amountPhp ?? 0;
    inputPhp.value = phpVal.toLocaleString('en-PH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

    inputPhp.addEventListener('input', () => {
      // Remove commas before parsing
      const raw = inputPhp.value.replace(/,/g, '');
      const val = parseFloat(raw) || 0;

      row.amountPhp = val;
      row.amountAud = val * stateP.phpAudRate;

      State.save(stateP);
      renderRows();   // re-render so AUD + totals update
    });

    tdPhp.appendChild(inputPhp);
    tr.appendChild(tdPhp);


    // Amount AUD (read-only; falls back to .amount for manual AUD entries)
    const tdAud = document.createElement('td');
    tdAud.className = 'amount';
    const audVal = row.amountAud ?? row.amount ?? 0;
    tdAud.textContent = audVal.toLocaleString('en-AU', {
      style: 'currency',
      currency: 'AUD'
    });
    tr.appendChild(tdAud);

    // Delete
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

function computePhilippinesLedgerTotal() {
  return (stateP.ledger || [])
    .filter(r => r.category && r.category.toLowerCase() === 'philippines')
    .reduce((a, r) => a + (r.amount || 0), 0);
}

function computePhilippinesDetailTotal() {
  return (stateP.philippines || [])
    .reduce((a, r) => a + (r.amountAud ?? r.amount ?? 0), 0);
}

function renderSummary() {
  const ledger = computePhilippinesLedgerTotal();
  const detail = computePhilippinesDetailTotal();
  const diff = ledger - detail;

  elsP.ledgerTotal.textContent = '$' + ledger.toFixed(2);
  elsP.detailTotal.textContent = '$' + detail.toFixed(2);
  elsP.difference.textContent = '$' + diff.toFixed(2);

  // New totals
  const totalPHP = computeTotalPHP();
  const totalAUD = computeTotalAUD();

  document.getElementById('phTotalPHP').textContent =
    totalPHP.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

  document.getElementById('phTotalAUD').textContent =
    totalAUD.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
}


/* ------------------------------
   CSV Import
------------------------------ */

function parsePhilippinesCsv(text, rate) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  const rows = [];

  lines.forEach((line, idx) => {
    const cols = splitCsvLine(line);
    if (!cols.length) return;
    if (idx === 0) return; // header

    const amountStr = cols[4] || '';
    const cd = (cols[5] || '').toLowerCase();
    const bookDate = cols[6] || '';
    const desc = cols[12] || 'PH transaction';

    let phpAmount = parseMoney(amountStr);
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
      alert('No transactions detected.');
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

  // Manual add (AUD adjustments at top card)
  elsP.addBtn.onclick = () => {
    const date = elsP.date.value;
    const desc = elsP.desc.value.trim();
    const amt = parseFloat(elsP.amount.value);
    const cat = elsP.category.value;

    if (!desc || isNaN(amt)) {
      alert('Enter description and amount.');
      return;
    }

    // Manual adjustments stored as AUD-only
    stateP.philippines.push({
      date,
      reason: desc,
      amount: amt,
      category: cat
    });

    State.save(stateP);
    renderRows();

    elsP.desc.value = '';
    elsP.amount.value = '';
  };

  elsP.addCatBtn.onclick = addNewPhCategory;
  elsP.importBtn.onclick = importPhilippinesCsv;
}

document.addEventListener('DOMContentLoaded', init);
