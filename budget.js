// ====================================================================
//  BUDGET.JS – FINAL VERSION (AU + PH + AUD conversions)
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
    if (isNaN(n)) n = 0;
    return n.toLocaleString("en-AU", {
        style: "currency",
        currency: "AUD"
    });
}

function formatPhp(n) {
    if (isNaN(n)) n = 0;
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

// AU Ledger Cost (IGNORE income)
function computeAuCost() {
    return state.ledger.reduce((sum, entry) => {
        const amt = entry.amount || 0;

        // If it's income → ignore
        if (entry.category && entry.category.toLowerCase() === "income") {
            return sum;
        }

        // Otherwise treat as cost (always positive)
        return sum + Math.abs(amt);
    }, 0);
}


// PH Ledger Cost in AUD
function computePhCostAud() {
    return state.philippines.reduce((sum, tx) => {
        const aud = tx.amountAud || 0;

        // Treat ALL PH rows as costs (Option A)
        return sum + Math.abs(aud);
    }, 0);
}


// ------------------------------
// PH Spend (PHP + AUD)
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
    return state.categories.reduce(
        (sum, c) => sum + (c.budgetMonthly || 0),
        0
    );
}

// ------------------------------
// PH Budget Total (PHP)
// ------------------------------
function computePhBudgetTotalPhp() {
    return state.phBudgetCategories.reduce(
        (sum, c) => sum + (c.budgetMonthly || 0),
        0
    );
}

// ------------------------------
// Profit / Loss
// ------------------------------
function computeProfitLoss(incomeAud, spendAud) {
    return incomeAud - spendAud;
}

// ====================================================================
// RENDER SUMMARY (TOP BOXES)
// ====================================================================
function computeSummary() {
    const els = {
        summaryIncome: document.getElementById("summaryIncome"),
        summaryHouse: document.getElementById("summaryHouse"),
        summarySamal: document.getElementById("summarySamal"),
        summaryTotalSpend: document.getElementById("summaryTotalSpend"),
        summaryProfitLoss: document.getElementById("summaryProfitLoss"),
        summaryTotalBudget: document.getElementById("summaryTotalBudget"),   // AU
        summaryTotalPhBudget: document.getElementById("summaryTotalPhBudget"), // PH AUD
        summaryCombinedBudget: document.getElementById("summaryCombinedBudget"),
        summaryLedger: document.getElementById("summaryLedger"),
        summaryPhilippines: document.getElementById("summaryPhilippines")
    };

    const income = state.income || 0;


   // AU spend (full ledger)
    const auLedger = computeAuLedgerTotal();

    // AU cost only (no income)
    const auCost = computeAuCost();

    // PH cost only (AUD)
    const phCostAud = computePhCostAud();


    // PH Spend
    const phSpendPhp = computePhSpendPhp();
    const phSpendAud = computePhSpendAud();

    // Budget totals
    const auBudgetAud = computeAuBudgetTotal();
    const phBudgetPhp = computePhBudgetTotalPhp();
    const phBudgetAud = phBudgetPhp * state.phpAudRate;

    // Combined budget AUD
    const combinedBudgetAud = auBudgetAud + phBudgetAud;

    // Overall Spend AUD
    const totalSpendAud = auCost + phCostAud;


    // Profit/Loss
    const profitLossAud = computeProfitLoss(income, totalSpendAud);

    // ------------------------------
    // Render values
    // ------------------------------
    if (els.summaryIncome) els.summaryIncome.textContent = formatAud(income);
    if (els.summaryHouse) els.summaryHouse.textContent = state.housePct + "%";
    if (els.summarySamal) els.summarySamal.textContent = state.samalPct + "%";
    // AU Cost
    const elAuCost = document.getElementById("summaryAuCost");
    if (elAuCost) elAuCost.textContent = formatAud(auCost);

    // PH Cost (AUD)
    const elPhCost = document.getElementById("summaryPhCost");
    if (elPhCost) elPhCost.textContent = formatAud(phCostAud);

    if (els.summaryTotalSpend) els.summaryTotalSpend.textContent = formatAud(totalSpendAud);
    if (els.summaryProfitLoss) els.summaryProfitLoss.textContent = formatAud(profitLossAud);

    // AU budget
    if (els.summaryTotalBudget) els.summaryTotalBudget.textContent = formatAud(auBudgetAud);

    // PH budget (AUD)
    if (els.summaryTotalPhBudget) els.summaryTotalPhBudget.textContent = formatAud(phBudgetAud);

    // Combined budget (AUD)
    if (els.summaryCombinedBudget) els.summaryCombinedBudget.textContent = formatAud(combinedBudgetAud);

    // summaryledger 
    if (els.summaryLedger) els.summaryLedger.textContent = formatAud(totalSpendAud);

    // PH Net spend (AUD)
    if (els.summaryPhilippines) els.summaryPhilippines.textContent = formatAud(phSpendAud);
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

        // Budget Input
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

        // Actual AU spend
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

        // Delete btn
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
