// debts.js – unified with shared global state.js

let state = State.load();   // <-- unified storage

// Ensure the fields exist in state
if (!Array.isArray(state.debts)) state.debts = [];
if (!Array.isArray(state.debtPayments)) state.debtPayments = [];
State.save(state);

const elsD = {
  debtName: document.getElementById('debtName'),
  debtTotal: document.getElementById('debtTotal'),
  addDebtBtn: document.getElementById('addDebtBtn'),
  debtsTableBody: document.getElementById('debtsTableBody'),

  paymentDate: document.getElementById('paymentDate'),
  paymentDebt: document.getElementById('paymentDebt'),
  paymentDesc: document.getElementById('paymentDesc'),
  paymentAmount: document.getElementById('paymentAmount'),
  addPaymentBtn: document.getElementById('addPaymentBtn'),
  paymentsTableBody: document.getElementById('paymentsTableBody')
};

function formatCurrency(v) {
  if (isNaN(v)) return '$0.00';
  return '$' + v.toFixed(2);
}

function parseMoney(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const cleaned = String(str).replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/* ------------------------------
    Debt Definition Table
------------------------------ */
function renderDebtDefinitions() {
  const tbody = elsD.debtsTableBody;
  if (!tbody) return;
  tbody.innerHTML = '';

  const paymentsByDebt = {};
  state.debtPayments.forEach(p => {
    const amt = parseMoney(p.amount);
    if (!paymentsByDebt[p.debtId]) paymentsByDebt[p.debtId] = 0;
    paymentsByDebt[p.debtId] += amt;
  });

  state.debts.forEach((debt, idx) => {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.textContent = debt.name;
    tr.appendChild(tdName);

    const tdTotal = document.createElement('td');
    tdTotal.className = 'amount';
    tdTotal.textContent = formatCurrency(parseMoney(debt.total));
    tr.appendChild(tdTotal);

    const scheduled = paymentsByDebt[debt.id] || 0;
    const tdScheduled = document.createElement('td');
    tdScheduled.className = 'amount';
    tdScheduled.textContent = formatCurrency(scheduled);
    tr.appendChild(tdScheduled);

    const remaining = parseMoney(debt.total) - scheduled;
    const tdRemain = document.createElement('td');
    tdRemain.className = 'amount';
    tdRemain.textContent = formatCurrency(remaining);
    tr.appendChild(tdRemain);

    const tdActions = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.className = 'secondary';
    delBtn.style.padding = '0.1rem 0.5rem';
    delBtn.onclick = () => {
      if (!confirm(`Delete debt "${debt.name}" and all payments?`)) return;
      const id = debt.id;

      state.debts.splice(idx, 1);
      state.debtPayments = state.debtPayments.filter(p => p.debtId !== id);

      State.save(state);
      renderDebtDefinitions();
      renderPayments();
      refreshDebtDropdown();
    };
    tdActions.appendChild(delBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

/* ------------------------------
    Dropdown for Assigning Payments
------------------------------ */
function refreshDebtDropdown() {
  const sel = elsD.paymentDebt;
  if (!sel) return;
  sel.innerHTML = '';

  const optEmpty = document.createElement('option');
  optEmpty.value = '';
  optEmpty.textContent = 'Select debt';
  sel.appendChild(optEmpty);

  state.debts.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    sel.appendChild(opt);
  });
}

/* ------------------------------
    Payments Table
------------------------------ */
function renderPayments() {
  const tbody = elsD.paymentsTableBody;
  if (!tbody) return;
  tbody.innerHTML = '';

  const payments = [...state.debtPayments];
  payments.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return da - db;
  });

  const runningByDebt = {};

  payments.forEach((p, idx) => {
    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.textContent = p.date || '';
    tr.appendChild(tdDate);

    const debt = state.debts.find(d => d.id === p.debtId);
    const debtName = debt ? debt.name : '(deleted debt)';

    const tdDebt = document.createElement('td');
    tdDebt.textContent = debtName;
    tr.appendChild(tdDebt);

    const tdDesc = document.createElement('td');
    tdDesc.textContent = p.description || '';
    tr.appendChild(tdDesc);

    const amountNum = parseMoney(p.amount);
    const tdAmt = document.createElement('td');
    tdAmt.className = 'amount';
    tdAmt.textContent = formatCurrency(amountNum);
    tr.appendChild(tdAmt);

    if (!runningByDebt[p.debtId]) runningByDebt[p.debtId] = 0;
    runningByDebt[p.debtId] += amountNum;

    const tdRun = document.createElement('td');
    tdRun.className = 'amount';
    tdRun.textContent = formatCurrency(runningByDebt[p.debtId]);
    tr.appendChild(tdRun);

    const tdActions = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.className = 'secondary';
    delBtn.style.padding = '0.1rem 0.5rem';
    delBtn.onclick = () => {
      if (!confirm('Delete this payment?')) return;

      const delIndex = state.debtPayments.findIndex(x => x.id === p.id);
      if (delIndex !== -1) {
        state.debtPayments.splice(delIndex, 1);
        State.save(state);
        renderDebtDefinitions();
        renderPayments();
      }
    };
    tdActions.appendChild(delBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

/* ------------------------------
    Adding a New Debt
------------------------------ */
function addDebt() {
  const name = elsD.debtName.value.trim();
  const total = parseMoney(elsD.debtTotal.value);

  if (!name || !total) {
    alert('Enter debt name & total.');
    return;
  }

  if (state.debts.some(d => d.name.toLowerCase() === name.toLowerCase())) {
    alert('Debt already exists.');
    return;
  }

  state.debts.push({
    id: Date.now().toString(),
    name,
    total
  });

  State.save(state);

  elsD.debtName.value = '';
  elsD.debtTotal.value = '';

  renderDebtDefinitions();
  refreshDebtDropdown();
}

/* ------------------------------
    Adding a Payment
------------------------------ */
function addPayment() {
  const date = elsD.paymentDate.value;
  const debtId = elsD.paymentDebt.value;
  const desc = elsD.paymentDesc.value.trim();
  const amount = parseMoney(elsD.paymentAmount.value);

  if (!debtId) {
    alert('Choose a debt.');
    return;
  }
  if (!amount) {
    alert('Enter an amount.');
    return;
  }

  state.debtPayments.push({
    id: Date.now().toString() + Math.random().toString(16).slice(2),
    date,
    debtId,
    description: desc,
    amount
  });

  State.save(state);

  elsD.paymentDesc.value = '';
  elsD.paymentAmount.value = '';

  renderDebtDefinitions();
  renderPayments();
}

/* ------------------------------
    Wiring
------------------------------ */
elsD.addDebtBtn.onclick = addDebt;
elsD.debtTotal.onkeydown = e => (e.key === 'Enter' ? addDebt() : null);

elsD.addPaymentBtn.onclick = addPayment;
elsD.paymentAmount.onkeydown = e => (e.key === 'Enter' ? addPayment() : null);

/* ------------------------------
    Initial Page Load
------------------------------ */
renderDebtDefinitions();
refreshDebtDropdown();
renderPayments();
