// income.js – unified with shared state.js

let state = State.load();   // <-- global unified state

// Ensure incomes exists
if (!Array.isArray(state.incomes)) state.incomes = [];
State.save(state);

const elsI = {
  tableBody: document.getElementById('incomeTableBody'),
  total: document.getElementById('incomeTotal')
};

function formatCurrency(v) {
  if (isNaN(v)) return '$0.00';
  return '$' + v.toFixed(2);
}

function normalizeDate(d) {
  if (!d) return '';
  const parsed = new Date(d);
  if (parsed.toString() === 'Invalid Date') return d;
  return parsed.toISOString().split('T')[0];
}

/* -------------------------------------------
   Sync income rows from ledger (category=Income)
-------------------------------------------- */
function syncIncomesFromLedger() {
  const incomes = [];

  (state.ledger || []).forEach(row => {
    if (!row) return;

    if (String(row.category || '').toLowerCase() !== 'income') return;

    const amt =
      typeof row.amount === 'number'
        ? row.amount
        : parseFloat(row.amount) || 0;

    incomes.push({
      date: normalizeDate(row.date),
      name: row.description || 'Income',
      amount: Math.abs(amt)
    });
  });

  // Sort newest (descending)
  incomes.sort((a, b) => (a.date < b.date ? 1 : -1));

  state.incomes = incomes;
  State.save(state);
}

/* -------------------------------------------
   Compute total income
-------------------------------------------- */
function computeIncomeTotal() {
  const total = (state.incomes || []).reduce(
    (sum, row) => sum + (parseFloat(row.amount) || 0),
    0
  );

  state.income = total;
  State.save(state);

  if (elsI.total) {
    elsI.total.textContent = formatCurrency(total);
  }
}

/* -------------------------------------------
   Render table
-------------------------------------------- */
function renderIncomes() {
  if (!elsI.tableBody) return;
  elsI.tableBody.innerHTML = '';

  (state.incomes || []).forEach(row => {
    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.textContent = row.date || '';
    tr.appendChild(tdDate);

    const tdName = document.createElement('td');
    tdName.textContent = row.name || '';
    tr.appendChild(tdName);

    const tdAmount = document.createElement('td');
    tdAmount.className = 'amount';
    tdAmount.textContent = formatCurrency(row.amount);
    tr.appendChild(tdAmount);

    elsI.tableBody.appendChild(tr);
  });
}

/* -------------------------------------------
   Initialize page
-------------------------------------------- */
syncIncomesFromLedger();
computeIncomeTotal();
renderIncomes();
