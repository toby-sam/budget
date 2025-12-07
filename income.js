// ===============================
//    INCOME PAGE CONTROLLER
//    (AU + Philippines Support)
// ===============================

// Load state from LocalStorage
let state = State.load();

// Ensure structures exist
if (!state.ledger) state.ledger = [];
if (!state.philippines) state.philippines = [];
if (typeof state.phpAudRate !== "number") state.phpAudRate = 0.026;  // conversion rate

// UI bindings (must match income.html)
const els = {
    auBody: document.getElementById("incomeTableBody"),
    auTotal: document.getElementById("incomeTotalAU"),

    phBody: document.getElementById("phIncomeTableBody"),
    phTotal: document.getElementById("incomeTotalPH"),
   

    combined: document.getElementById("incomeTotalAll")
};

// Format currency
const fmt = v => "$" + Number(v || 0).toFixed(2);


// =====================================================
//  BUILD INCOME LISTS FROM LEDGERS
// =====================================================
function calculateIncome() {

    let AU = [];
    let PH = [];

    // ---------- AUSTRALIAN LEDGER ----------
    state.ledger.forEach(row => {
        if (row && String(row.category).toLowerCase() === "income") {
            AU.push({
                date: row.date,
                source: row.description || "Income",
                amount: Math.abs(Number(row.amount) || 0)
            });
        }
    });

    // ---------- PHILIPPINE LEDGER ----------
    state.philippines.forEach(row => {
        if (row && String(row.category).toLowerCase() === "income") {
            let audValue = Number(row.amountAud) || 0;
            PH.push({
                date: row.date,
                source: row.desc || "PH Income",
                amountAud: audValue
            });
        }
    });

    // Totals
    state.totalIncomeAU = AU.reduce((t, r) => t + r.amount, 0);
    state.totalIncomePH = PH.reduce((t, r) => t + r.amountAud, 0);
    state.totalIncomeAll = state.totalIncomeAU + state.totalIncomePH;

    State.save(state);
    renderIncomePage(AU, PH);
}


// =====================================================
//  RENDER INTO HTML TABLES
// =====================================================
function renderIncomePage(AU, PH) {

    // ----- AU Income -----
    els.auBody.innerHTML = "";
    AU.forEach(r => {
        els.auBody.innerHTML += `
        <tr>
            <td>${r.date}</td>
            <td>${r.source}</td>
            <td>${fmt(r.amount)}</td>
        </tr>`;
    });

    // 🔥 THIS WAS MISSING — NOW THE AU TOTAL DISPLAYS
    els.auTotal.textContent = fmt(state.totalIncomeAU);



    // ----- PH Income -----
    els.phBody.innerHTML = "";
    PH.forEach(r => {
        els.phBody.innerHTML += `
        <tr>
            <td>${r.date}</td>
            <td>${r.source}</td>
            <td>${fmt(r.amountAud)}</td>
        </tr>`;
    });

    els.phTotal.textContent = fmt(state.totalIncomePH);



    // ----- Combined Total -----
    els.combined.textContent = fmt(state.totalIncomeAll);
}


// Init run
calculateIncome();
