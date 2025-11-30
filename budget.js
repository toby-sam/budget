// ====================================================================
//  BUDGET.JS – FULL CLEAN REBUILD (AU + PH + Profit/Loss fixed)
// ====================================================================

// ------------------------------
// Load State
// ------------------------------
let state = State.load();
if (!state.categories) state.categories = [];
if (!state.ledger) state.ledger = [];
if (!state.philippines) state.philippines = [];
if (!state.phBudgetCategories) state.phBudgetCategories = [];
if (!state.phpAudRate) state.phpAudRate = 0.0259;

// ------------------------------
// Format Helpers
// ------------------------------
function formatAud(n) {
    return n.toLocaleString("en-AU", {
        style: "currency",
        currency: "AUD"
    });
}

function formatPhp(n) {
    return n.toLocaleString("en-PH", {
        style: "currency",
        currency: "PHP"
    });
}

// ------------------------------
// AU Ledger Spend
// ------------------------------
function computeAuLedgerTotal() {
    return state.ledger.reduce((sum, entry) => sum + (entry.amount || 0), 0);
}

// ------------------------------
// PH Spend in PHP and AUD
// ------------------------------
function computePhSpendPhp() {
    return state.philippines.reduce((sum, tx) => {
        return sum + (tx.amountPhp || 0);
    }, 0);
}

function computePhSpendAud() {
    return computePhSpendPhp() * state.phpAudRate;
}

// ------------------------------
// AU Budget Total
// ------------------------------
function computeAuBudgetTotal() {
    return state.categories.reduce((sum, c) => sum + (c.budgetMonthly || 0), 0);
}

// ------------------------------
// PH Budget Total (PHP)
// ------------------------------
function computePhBudgetTotalPhp() {
    return state.phBudgetCategories.reduce((sum, c) => sum + (c.budgetMonthly || 0), 0);
}

// ------------------------------
// Profit / Loss Helper
// ------------------------------
function computeProfitLoss(incomeAud, spendAud) {
    return incomeAud - spendAud;
}

// ------------------------------
// Render Summary (TOP BOXES)
// ------------------------------
function computeSummary() {
    const els = {
        summaryIncome: document.getElementById("summaryIncome"),
        summaryHouse: document.getElementById("summaryHouse"),
        summarySamal: document.getElementById("summarySamal"),
        summaryTotalSpend: document.getElementById("summaryTotalSpend"),
        summaryProfitLoss: document.getElementById("summaryProfitLoss"),
        summaryTotalBudget: document.getElementById("summaryTotalBudget"),
        summaryLedger: document.getElementById("summaryLedger"),
        summaryPhilippines: document.getElementById("summaryPhilippines"),
    };

    const income = state.income || 0;

    const auLedger = computeAuLedgerTotal();                   // AU spend
    const phSpendAud = computePhSpendAud();                    // PH spend converted to AUD
    const totalSpendAud = auLedger + phSpendAud;               // Combined spend
    const profitLoss = computeProfitLoss(income, totalSpendAud);

    // Render summary
    els.summaryIncome.textContent = formatAud(income);
    els.summaryHouse.textContent = state.housePct + "%";
    els.summarySamal.textContent = state.samalPct + "%";

    els.summaryTotalSpend.textContent = formatAud(totalSpendAud);
    els.summaryProfitLoss.textContent = formatAud(profitLoss);

    els.summaryTotalBudget.textContent = formatAud(computeAuBudgetTotal());

    els.summaryLedger.textContent = formatAud(auLedger);

    // PH Net Spend (AUD)
    els.summaryPhilippines.textContent = formatAud(phSpendAud);
}

// ====================================================================
// CATEGORY TABLE (AU)
// ====================================================================
function computeActualsByCategory() {
    const map = {};

    state.ledger.forEach(entry => {
        if (!entry.category) return;
        if (!map[entry.category]) map[entry.category] = 0;
        map[entry.category] += entry.amount || 0;
    });

    return map;
}

function renderCategories() {
    const body = document.querySelector("#categoriesTable tbody");
    body.innerHTML = "";

    const actuals = computeActualsByCategory();

    const sorted = [...state.categories].sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    sorted.forEach(cat => {
        const idx = state.categories.findIndex(c => c.name === cat.name);
        if (idx === -1) return;

        const tr = document.createElement("tr");

        // Name
        const tdName = document.createElement("td");
        tdName.textContent = cat.name;
        tr.appendChild(tdName);

        // Budget input
        const tdBudget = document.createElement("td");
        tdBudget.className = "amount";

        const input = document.createElement("input");
        input.type = "number";
        input.step = "0.01";
        input.value = cat.budgetMonthly || 0;
        input.style.width = "90px";

        input.oninput = () => {
            state.categories[idx].budgetMonthly = parseFloat(input.value) || 0;
            State.save(state);
        };

        input.onblur = () => {
            State.save(state);
            renderCategories();
            computeSummary();
        };

        tdBudget.appendChild(input);
        tr.appendChild(tdBudget);

        // Actual Spend
        const actual = actuals[cat.name] || 0;
        const tdActual = document.createElement("td");
        tdActual.className = "amount";
        tdActual.textContent = formatAud(actual);
        tr.appendChild(tdActual);

        // Difference
        const diff = (cat.budgetMonthly || 0) - actual;
        const tdDiff = document.createElement("td");
        tdDiff.className = "amount";
        tdDiff.textContent = formatAud(diff);
        tr.appendChild(tdDiff);

        // Status
        const tdStatus = document.createElement("td");
        tdStatus.textContent = diff >= 0 ? "Under Budget" : "Over Budget";
        tdStatus.className = diff >= 0 ? "status-positive" : "status-negative";
        tr.appendChild(tdStatus);

        // Delete button
        const tdDelete = document.createElement("td");
        const btn = document.createElement("button");
        btn.textContent = "✕";
        btn.className = "delete-btn";
        btn.onclick = () => {
            state.categories.splice(idx, 1);
            State.save(state);
            renderCategories();
            computeSummary();
        };
        tdDelete.appendChild(btn);
        tr.appendChild(tdDelete);

        body.appendChild(tr);
    });
}

function addCategory() {
    const nameEl = document.getElementById("newCategoryName");
    const budgetEl = document.getElementById("newCategoryMonthly");

    const name = nameEl.value.trim();
    const budget = parseFloat(budgetEl.value) || 0;

    if (!name) return alert("Enter a category name.");

    if (state.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        return alert("Category already exists.");
    }

    state.categories.push({
        name,
        budgetMonthly: budget
    });

    State.save(state);
    nameEl.value = "";
    budgetEl.value = "";

    renderCategories();
    computeSummary();
}

// ====================================================================
// BACKUP
// ====================================================================
function downloadBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/json"
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "budget-backup.json";
    a.click();
}

function triggerLoadBackup() {
    document.getElementById("loadBackupInput").click();
}

function handleBackupFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
        try {
            state = JSON.parse(ev.target.result);
            State.save(state);
            renderCategories();
            computeSummary();
            alert("Backup restored.");
        } catch {
            alert("Invalid backup file.");
        }
    };

    reader.readAsText(file);
}

// ====================================================================
// INIT
// ====================================================================
function init() {
    computeSummary();
    renderCategories();

    document.getElementById("addCategoryBtn").onclick = addCategory;
    document.getElementById("saveBackupBtn").onclick = downloadBackup;
    document.getElementById("loadBackupBtn").onclick = triggerLoadBackup;
    document.getElementById("loadBackupInput").onchange = handleBackupFileChange;
    document.getElementById("refreshBtn").onclick = () => {
        computeSummary();
        renderCategories();
    };
}

document.addEventListener("DOMContentLoaded", init);
