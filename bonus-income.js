// =============================================
// bonus-income.js – Bonus Income Tracker
// =============================================

// Load global state
let stateBI = State.load();

// Ensure array exists
if (!Array.isArray(stateBI.bonusIncome)) stateBI.bonusIncome = [];

// ------------------------------
// Elements
// ------------------------------
const elsBI = {
    date: document.getElementById("bonusDate"),
    desc: document.getElementById("bonusDesc"),
    amount: document.getElementById("bonusAmount"),
    addBtn: document.getElementById("addBonusBtn"),

    tableBody: document.getElementById("bonusTableBody"),

    totalIncome: document.getElementById("bonusTotalIncome"),
    totalEntries: document.getElementById("bonusTotalEntries")
};

// ------------------------------
// Helpers
// ------------------------------
function formatAUD(n) {
    return n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

function normalizeBonusDate(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// ------------------------------
// Summary Computation
// ------------------------------
function computeTotals() {
    let totalIncome = 0;
    let totalEntries = stateBI.bonusIncome.length;

    stateBI.bonusIncome.forEach(entry => {
        totalIncome += entry.amount || 0;
    });

    // Update UI
    elsBI.totalIncome.textContent = formatAUD(totalIncome);
    elsBI.totalEntries.textContent = totalEntries;
}

// ------------------------------
// Render Table
// ------------------------------
function renderTable() {
    elsBI.tableBody.innerHTML = "";

    const rows = [...stateBI.bonusIncome].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );

    rows.forEach(entry => {
        const tr = document.createElement("tr");

        // Date
        const tdDate = document.createElement("td");
        tdDate.textContent = entry.date;
        tr.appendChild(tdDate);

        // Description
        const tdDesc = document.createElement("td");
        const inpDesc = document.createElement("input");
        inpDesc.type = "text";
        inpDesc.style.width = "95%";
        inpDesc.value = entry.description || "";
        inpDesc.oninput = () => {
            entry.description = inpDesc.value;
            State.save(stateBI);
        };
        tdDesc.appendChild(inpDesc);
        tr.appendChild(tdDesc);

        // Amount
        const tdAmount = document.createElement("td");
        const inpAmount = document.createElement("input");
        inpAmount.type = "number";
        inpAmount.step = "0.01";
        inpAmount.value = entry.amount || 0;
        inpAmount.oninput = () => {
            entry.amount = parseFloat(inpAmount.value) || 0;
            State.save(stateBI);
            computeTotals();
        };
        tdAmount.appendChild(inpAmount);
        tr.appendChild(tdAmount);

        // Delete button
        const tdDel = document.createElement("td");
        const btn = document.createElement("button");
        btn.textContent = "✕";
        btn.className = "secondary";
        btn.onclick = () => {
            const idx = stateBI.bonusIncome.indexOf(entry);
            if (idx !== -1) {
                stateBI.bonusIncome.splice(idx, 1);
                State.save(stateBI);
                renderTable();
            }
        };
        tdDel.appendChild(btn);
        tr.appendChild(tdDel);

        elsBI.tableBody.appendChild(tr);
    });

    computeTotals();
}

// ------------------------------
// Init
// ------------------------------
function init() {
    renderTable();

    elsBI.addBtn.onclick = () => {
        const date = elsBI.date.value;
        if (!date) return alert("Choose a date.");

        const desc = elsBI.desc.value.trim();
        if (!desc) return alert("Enter description.");

        const amount = parseFloat(elsBI.amount.value) || 0;

        stateBI.bonusIncome.push({
            date: normalizeBonusDate(date),
            description: desc,
            amount: amount
        });

        State.save(stateBI);
        renderTable();

        elsBI.desc.value = "";
        elsBI.amount.value = "";
    };
}

document.addEventListener("DOMContentLoaded", init);
