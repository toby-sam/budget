// investments.js – unified with shared global state.js

let state = State.load();   // <-- unified global state

// Ensure investments array exists
if (!Array.isArray(state.investments)) state.investments = [];
State.save(state);

const elsInv = {
  date: document.getElementById('invDate'),
  name: document.getElementById('invName'),
  desc: document.getElementById('invDesc'),
  value: document.getElementById('invValue'),
  addBtn: document.getElementById('addInvBtn'),
  tableBody: document.getElementById('investmentsTableBody')
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

/* -----------------------------------------
   Render Investments Table
----------------------------------------- */
function renderInvestments() {
  const tbody = elsInv.tableBody;
  if (!tbody) return;
  tbody.innerHTML = '';

  const rows = [...state.investments];
  rows.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  rows.forEach(inv => {
    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.textContent = inv.date || '';
    tr.appendChild(tdDate);

    const tdName = document.createElement('td');
    tdName.textContent = inv.name || '';
    tr.appendChild(tdName);

    const tdDesc = document.createElement('td');
    tdDesc.textContent = inv.description || '';
    tr.appendChild(tdDesc);

    const tdVal = document.createElement('td');
    tdVal.className = 'amount';
    tdVal.textContent = formatCurrency(parseMoney(inv.value));
    tr.appendChild(tdVal);

    const tdActions = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.className = 'secondary';
    delBtn.style.padding = '0.1rem 0.5rem';
    delBtn.onclick = () => {
      if (!confirm('Delete this investment?')) return;

      const idx = state.investments.findIndex(x => x.id === inv.id);
      if (idx !== -1) {
        state.investments.splice(idx, 1);
        State.save(state);
        renderInvestments();
      }
    };
    tdActions.appendChild(delBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

/* -----------------------------------------
   Add New Investment
----------------------------------------- */
function addInvestment() {
  const date = elsInv.date.value;
  const name = elsInv.name.value.trim();
  const desc = elsInv.desc.value.trim();
  const value = parseMoney(elsInv.value.value);

  if (!name || !value) {
    alert('Please enter a name and value.');
    return;
  }

  state.investments.push({
    id: Date.now().toString() + Math.random().toString(16).slice(2),
    date,
    name,
    description: desc,
    value
  });

  State.save(state);

  elsInv.desc.value = '';
  elsInv.value.value = '';

  renderInvestments();
}

/* -----------------------------------------
   Events
----------------------------------------- */
if (elsInv.addBtn) elsInv.addBtn.onclick = addInvestment;

if (elsInv.value) {
  elsInv.value.onkeydown = e => {
    if (e.key === 'Enter') addInvestment();
  };
}

/* -----------------------------------------
   Initial Render
----------------------------------------- */
renderInvestments();
