// =============================================
// solect.js – CLEAN, FINAL, NO-CATEGORY-CREATION
// =============================================

// Load global state
let stateP = State.load();
let SolectDeleteHistory = [];

// Ensure array exists
if (!Array.isArray(stateP.solect)) stateP.solect = [];

// Solect Budget Categories ONLY (read-only source for category dropdown)
if (!Array.isArray(stateP.solectBudgetCategories)) stateP.solectBudgetCategories = [];

if (typeof stateP.solAudRate !== "number" || stateP.solAudRate <= 0) {
    stateP.solAudRate = 0.0259;
    State.save(stateP);
}

// One-time correction: old default was 1.0 which isn't a valid SOL→AUD rate.
// The flag stops this from re-running if the user later sets 1.0 on purpose.
if (!stateP._solAudRateMigratedFrom10 && stateP.solAudRate === 1) {
    stateP.solAudRate = 0.0259;
    stateP._solAudRateMigratedFrom10 = true;
    State.save(stateP);
}

// ------------------------------
// Elements
// ------------------------------
const elsP = {
    date: document.getElementById("SolectDate"),
    desc: document.getElementById("SolectDesc"),
    amount: document.getElementById("SolectAmount"),
    type: document.getElementById("SolectType"),
    category: document.getElementById("SolectCategory"),
    addBtn: document.getElementById("addSolectBtn"),

    newCategoryName: document.getElementById("newSolectCategoryName"),
    addCategoryBtn: document.getElementById("addSolectCategoryBtn"),
    categoryChips: document.getElementById("solectCategoryChips"),

    tableBody: document.getElementById("SolectTableBody"),

    csvFile: document.getElementById("SolectCsvFile"),
    importBtn: document.getElementById("importSolectCsvBtn"),
    undoBtn: document.getElementById("undoSolectImportBtn"),
    exportBtn: document.getElementById("exportSolectCsvBtn"),

    rateInput: document.getElementById("SolectRateInput"),
    rateDisplay: document.getElementById("SolectRateDisplay"),

    moneySent: document.getElementById("SolectMoneySent"),
    moneyEarned: document.getElementById("SolectMoneyEarned"),
    moneySpent: document.getElementById("SolectMoneySpent"),
    SolectNet: document.getElementById("SolectNet"),
    SolectLeft: document.getElementById("SolectLeft"),
    totalSOL: document.getElementById("SolectTotalSOL"),
    totalAUD: document.getElementById("SolectTotalAUD"),

    undoDeleteBtn: document.getElementById("undoSolectDeleteBtn")
};

// ------------------------------
// Helpers
// ------------------------------
function parseMoney(str) {
    if (!str) return 0;
    const cleaned = String(str).replace(/[^0-9.-]/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
}

function formatSOL(n) {
    return n.toLocaleString("en-US", { style: "currency", currency: "PHP" });
}

function formatAUD(n) {
    return n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

function normaliseSolectDate(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString("en-Solect", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// ------------------------------
// Category Dropdown – READ ONLY from Solect Budget
// ------------------------------
function populateCategoryDropdown() {
    elsP.category.innerHTML = "";

    [...stateP.solectBudgetCategories]
        .sort((a,b) => a.name.localeCompare(b.name))   // 🔥 ALSolectABETICAL SORT
        .forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.name;
            opt.textContent = cat.name;
            elsP.category.appendChild(opt);
        });
}


// ------------------------------
// Manage Categories (add / remove)
// ------------------------------
function renderSolectCategoryChips() {
    if (!elsP.categoryChips) return;

    elsP.categoryChips.innerHTML = "";

    if (!Array.isArray(stateP.solectBudgetCategories) || stateP.solectBudgetCategories.length === 0) {
        const empty = document.createElement("div");
        empty.className = "small";
        empty.textContent = "No categories yet.";
        elsP.categoryChips.appendChild(empty);
        return;
    }

    const sorted = [...stateP.solectBudgetCategories].sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    sorted.forEach(cat => {
        const chip = document.createElement("span");
        chip.style.cssText =
            "display:inline-flex; align-items:center; gap:0.35rem; padding:0.25rem 0.55rem; background:#eef; border:1px solid #ccd; border-radius:999px; font-size:0.9rem;";
        chip.textContent = cat.name;

        const del = document.createElement("button");
        del.textContent = "✕";
        del.title = `Remove "${cat.name}"`;
        del.style.cssText =
            "border:none; background:transparent; cursor:pointer; font-weight:bold; color:#a00; padding:0 0.15rem;";
        del.onclick = () => {
            const inUse = stateP.solect.some(r => r.category === cat.name);
            const msg = inUse
                ? `"${cat.name}" is used by existing Solect entries. Remove it anyway? Those entries will become uncategorised.`
                : `Remove category "${cat.name}"?`;
            if (!confirm(msg)) return;

            stateP.solectBudgetCategories = stateP.solectBudgetCategories.filter(c => c.name !== cat.name);
            if (inUse) {
                stateP.solect.forEach(r => {
                    if (r.category === cat.name) r.category = "";
                });
            }
            State.save(stateP);
            renderSolectCategoryChips();
            populateCategoryDropdown();
            renderRows();
        };

        chip.appendChild(del);
        elsP.categoryChips.appendChild(chip);
    });
}

function setupSolectCategoryManager() {
    if (!elsP.addCategoryBtn || !elsP.newCategoryName) return;

    const addCategory = () => {
        const name = (elsP.newCategoryName.value || "").trim();
        if (!name) {
            alert("Enter a category name.");
            return;
        }
        if (stateP.solectBudgetCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            alert("Category already exists.");
            return;
        }

        stateP.solectBudgetCategories.push({ name, budgetMonthly: 0 });
        State.save(stateP);
        elsP.newCategoryName.value = "";
        renderSolectCategoryChips();
        populateCategoryDropdown();
        renderRows();
    };

    elsP.addCategoryBtn.onclick = addCategory;
    elsP.newCategoryName.addEventListener("keydown", e => {
        if (e.key === "Enter") addCategory();
    });
}

// ------------------------------
// Summary Computation
// ------------------------------
// ------------------------------
// Summary Computation
// ------------------------------
// ------------------------------
// Summary Computation (FINAL – per requirements)
// ------------------------------
// =========================
// Summary Computation (FINAL REQUIRED VERSION)
// =========================
function computeTotals() {

    let sentSOL = 0;     // AU_Income category transactions (SOL)
    let earnedSOL = 0;   // Income category (SOL)
    let spentSOL = 0;    // All other categories = Solect Spend (SOL)
    let runningTotalSOL = 0;  // Running total of all entries (excluding "income")

    stateP.solect.forEach(r => {

        const SOL = r.amountSOL || 0;
        const cat = r.category?.toLowerCase() || "";

        // Determine income vs expense.
        // New rows carry an explicit type ('debit' | 'credit').
        // Legacy rows fall back to category-based detection.
        let isCredit;
        if (r.type === "credit") isCredit = true;
        else if (r.type === "debit") isCredit = false;
        else isCredit = (cat === "income" || cat === "au_income");

        // Running total excludes earned-in-Solect income (matches prior semantics)
        if (cat !== "income") {
            runningTotalSOL += SOL;
        }

        if (isCredit) {
            // au_income = sent from Australia; anything else credit = earned in Solect
            if (cat === "au_income") sentSOL += SOL;
            else earnedSOL += SOL;
        } else {
            spentSOL += SOL;
        }
    });

    // Calculate Net
    let SolectNetSOL = sentSOL + earnedSOL - spentSOL;
    let SolectNetAUD = SolectNetSOL * stateP.solAudRate;

    // Convert spent to AUD
    let spentAUD = spentSOL * stateP.solAudRate;

    // UPDATE UI DISPLAY
    document.getElementById("Solect_income").textContent = formatSOL(earnedSOL);
    document.getElementById("Solect_net").textContent    = formatSOL(SolectNetSOL);
    document.getElementById("Solect_net_aud").textContent = formatAUD(SolectNetAUD);
}




// ------------------------------
// Render Ledger Table
// ------------------------------
function renderRows() {
    elsP.tableBody.innerHTML = "";

    const rows = [...stateP.solect].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );

    rows.forEach(row => {
        const tr = document.createElement("tr");

        // Date
        const tdDate = document.createElement("td");
        tdDate.textContent = row.date;
        tr.appendChild(tdDate);

        // Description
        const tdDesc = document.createElement("td");
        const inpDesc = document.createElement("input");
        inpDesc.type = "text";
        inpDesc.style.width = "95%";
        inpDesc.value = row.reason || "";
        inpDesc.oninput = () => {
            row.reason = inpDesc.value;
            State.save(stateP);
        };
        tdDesc.appendChild(inpDesc);
        tr.appendChild(tdDesc);
// Category (Solect Budget only)
const tdCat = document.createElement("td");
const sel = document.createElement("select");

// Sort alSolectabetically before building list
const sortedCats = [...stateP.solectBudgetCategories].sort((a,b) => 
    a.name.localeCompare(b.name)
);

sortedCats.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.name;
    opt.textContent = cat.name;
    if (row.category === cat.name) opt.selected = true;
    sel.appendChild(opt);
});

sel.onchange = () => {
    row.category = sel.value;
    State.save(stateP);
};

tdCat.appendChild(sel);
tr.appendChild(tdCat);


        // SOL amount
        const tdSOL = document.createElement("td");
        const inpSOL = document.createElement("input");
        inpSOL.type = "number";
        inpSOL.step = "0.01";
        inpSOL.value = row.amountSOL || 0;
        inpSOL.oninput = () => {
            row.amountSOL = parseFloat(inpSOL.value) || 0;
            row.amountAud = row.amountSOL * stateP.solAudRate;
            tdAud.textContent = formatAUD(row.amountAud);
            State.save(stateP);
        };
        tdSOL.appendChild(inpSOL);
        tr.appendChild(tdSOL);

        // AUD amount (calculated only)
        const tdAud = document.createElement("td");
        tdAud.textContent = formatAUD(row.amountAud || 0);
        tr.appendChild(tdAud);

        // Delete button
        const tdDel = document.createElement("td");
        const btn = document.createElement("button");
        btn.textContent = "✕";
        btn.className = "secondary";
        btn.onclick = () => {
            const idx = stateP.solect.indexOf(row);
            if (idx !== -1) {
                SolectDeleteHistory.push({ index: idx, row: { ...row } });
                stateP.solect.splice(idx, 1);
                State.save(stateP);
                renderRows();
            }
        };
        tdDel.appendChild(btn);
        tr.appendChild(tdDel);

        elsP.tableBody.appendChild(tr);
    });

    computeTotals();
}

// ------------------------------
// CSV Import (NO category generation!)
// ------------------------------
function parsesolectCsv(text, rate) {
    const rows = [];
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");

    lines.forEach((line, idx) => {
        if (idx === 0) return;

        const cols = line.split(",");

        const SOL = parseMoney(cols[4]);
        const date = cols[6];
        const desc = cols[12] || "Solect Transaction";

        rows.push({
            date: normaliseSolectDate(date),
            reason: desc,
            category: "",  // user assigns later
            amountSOL: SOL,
            amountAud: SOL * rate
        });
    });

    return rows;
}

function importsolectCsv() {
    const file = elsP.csvFile.files[0];
    if (!file) return alert("Choose a CSV file.");

    const reader = new FileReader();
    reader.onload = e => {
        stateP.solectLastImport = [...stateP.solect];
        const rows = parsesolectCsv(e.target.result, stateP.solAudRate);
        stateP.solect.push(...rows);
        State.save(stateP);
        renderRows();
        alert("CSV imported.");
    };
    reader.readAsText(file);
}

// Undo last CSV import
function undoLastSolectImport() {
    if (!stateP.solectLastImport) return alert("Nothing to undo.");

    stateP.solect = [...stateP.solectLastImport];
    delete stateP.solectLastImport;

    State.save(stateP);
    renderRows();
}

// Export CSV
function exportsolectCsv() {
    if (!stateP.solect.length) return alert("Nothing to export.");

    let csv = "Date,Description,Category,AmountSOL,AmountAUD\n";

    stateP.solect.forEach(r => {
        csv += `"${r.date}","${r.reason}","${r.category}",${r.amountSOL},${r.amountAud}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "solect_export.csv";
    a.click();
    URL.revokeObjectURL(url);
}

// ------------------------------
// Init
// ------------------------------
function init() {
    populateCategoryDropdown();
    renderSolectCategoryChips();
    setupSolectCategoryManager();
    renderRows();

    elsP.addBtn.onclick = () => {
        const date = elsP.date.value;
        if (!date) return alert("Choose a date.");

        const desc = elsP.desc.value.trim();
        if (!desc) return alert("Enter description.");

        const SOL = parseFloat(elsP.amount.value) || 0;
        const cat = elsP.category.value;
        const type = elsP.type ? elsP.type.value : "debit";

        stateP.solect.push({
            date: normaliseSolectDate(date),
            reason: desc,
            amountSOL: SOL,
            amountAud: SOL * stateP.solAudRate,
            category: cat,
            type
        });

        State.save(stateP);
        renderRows();

        elsP.desc.value = "";
        elsP.amount.value = "";
    };

    elsP.importBtn.onclick = importsolectCsv;
    elsP.undoBtn.onclick = undoLastSolectImport;
    elsP.exportBtn.onclick = exportsolectCsv;

    elsP.undoDeleteBtn.onclick = () => {
        if (!SolectDeleteHistory.length) return alert("Nothing to undo.");

        const last = SolectDeleteHistory.pop();
        stateP.solect.splice(last.index, 0, last.row);

        State.save(stateP);
        renderRows();
    };

    elsP.rateInput.oninput = () => {
        const v = parseFloat(elsP.rateInput.value);
        if (v > 0) {
            stateP.solAudRate = v;
            State.save(stateP);
            renderRows();
        }
    };

    elsP.rateDisplay.textContent = `1 PHP = ${stateP.solAudRate.toFixed(4)} AUD`;
}

document.addEventListener("DOMContentLoaded", init);
