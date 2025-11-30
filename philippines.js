// =============================================
// philippines.js – CLEAN, FINAL, NO-CATEGORY-CREATION
// =============================================

// Load global state
let stateP = State.load();
let phDeleteHistory = [];

// Ensure array exists
if (!Array.isArray(stateP.philippines)) stateP.philippines = [];

// PH Budget Categories ONLY (read-only source for category dropdown)
if (!Array.isArray(stateP.phBudgetCategories)) stateP.phBudgetCategories = [];

if (typeof stateP.phpAudRate !== "number" || stateP.phpAudRate <= 0) {
    stateP.phpAudRate = 0.0259;
    State.save(stateP);
}

// ------------------------------
// Elements
// ------------------------------
const elsP = {
    date: document.getElementById("phDate"),
    desc: document.getElementById("phDesc"),
    amount: document.getElementById("phAmount"),
    category: document.getElementById("phCategory"),
    addBtn: document.getElementById("addPhBtn"),

    tableBody: document.getElementById("phTableBody"),

    csvFile: document.getElementById("phCsvFile"),
    importBtn: document.getElementById("importPhCsvBtn"),
    undoBtn: document.getElementById("undoPhImportBtn"),
    exportBtn: document.getElementById("exportPhCsvBtn"),

    rateInput: document.getElementById("phRateInput"),
    rateDisplay: document.getElementById("phRateDisplay"),

    moneySent: document.getElementById("phMoneySent"),
    moneyEarned: document.getElementById("phMoneyEarned"),
    moneySpent: document.getElementById("phMoneySpent"),
    phNet: document.getElementById("phNet"),
    phLeft: document.getElementById("phLeft"),
    totalPHP: document.getElementById("phTotalPHP"),
    totalAUD: document.getElementById("phTotalAUD"),

    undoDeleteBtn: document.getElementById("undoPhDeleteBtn")
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

function formatPHP(n) {
    return n.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
}

function formatAUD(n) {
    return n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

function normalisePhDate(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString("en-PH", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// ------------------------------
// Category Dropdown – READ ONLY from PH Budget
// ------------------------------
function populateCategoryDropdown() {
    elsP.category.innerHTML = "";

    stateP.phBudgetCategories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.name;
        opt.textContent = cat.name;
        elsP.category.appendChild(opt);
    });
}

// ------------------------------
// Summary Computation
// ------------------------------
function computeTotals() {
    let earned = 0, spent = 0, totalPHP = 0, totalAUD = 0;

    stateP.philippines.forEach(r => {
        const php = r.amountPhp || 0;
        const aud = r.amountAud || 0;

        if (aud > 0) earned += aud;
        if (aud < 0) spent += Math.abs(aud);

        totalPHP += php;
        totalAUD += aud;
    });

    elsP.moneyEarned.textContent = formatAUD(earned);
    elsP.moneySpent.textContent = formatAUD(spent);
    elsP.moneySent.textContent = formatAUD(0);
    elsP.phNet.textContent = formatAUD(earned - spent);
    elsP.phLeft.textContent = formatAUD(earned - spent);
    elsP.totalPHP.textContent = formatPHP(totalPHP);
    elsP.totalAUD.textContent = formatAUD(totalAUD);
}

// ------------------------------
// Render Ledger Table
// ------------------------------
function renderRows() {
    elsP.tableBody.innerHTML = "";

    const rows = [...stateP.philippines].sort(
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

        // Category (PH Budget only)
        const tdCat = document.createElement("td");
        const sel = document.createElement("select");

        stateP.phBudgetCategories.forEach(cat => {
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

        // PHP amount
        const tdPhp = document.createElement("td");
        const inpPhp = document.createElement("input");
        inpPhp.type = "number";
        inpPhp.step = "0.01";
        inpPhp.value = row.amountPhp || 0;
        inpPhp.oninput = () => {
            row.amountPhp = parseFloat(inpPhp.value) || 0;
            row.amountAud = row.amountPhp * stateP.phpAudRate;
            tdAud.textContent = formatAUD(row.amountAud);
            State.save(stateP);
        };
        tdPhp.appendChild(inpPhp);
        tr.appendChild(tdPhp);

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
            const idx = stateP.philippines.indexOf(row);
            if (idx !== -1) {
                phDeleteHistory.push({ index: idx, row: { ...row } });
                stateP.philippines.splice(idx, 1);
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
function parsePhilippinesCsv(text, rate) {
    const rows = [];
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");

    lines.forEach((line, idx) => {
        if (idx === 0) return;

        const cols = line.split(",");

        const php = parseMoney(cols[4]);
        const date = cols[6];
        const desc = cols[12] || "PH Transaction";

        rows.push({
            date: normalisePhDate(date),
            reason: desc,
            category: "",  // user assigns later
            amountPhp: php,
            amountAud: php * rate
        });
    });

    return rows;
}

function importPhilippinesCsv() {
    const file = elsP.csvFile.files[0];
    if (!file) return alert("Choose a CSV file.");

    const reader = new FileReader();
    reader.onload = e => {
        stateP.phLastImport = [...stateP.philippines];
        const rows = parsePhilippinesCsv(e.target.result, stateP.phpAudRate);
        stateP.philippines.push(...rows);
        State.save(stateP);
        renderRows();
        alert("CSV imported.");
    };
    reader.readAsText(file);
}

// Undo last CSV import
function undoLastPhImport() {
    if (!stateP.phLastImport) return alert("Nothing to undo.");

    stateP.philippines = [...stateP.phLastImport];
    delete stateP.phLastImport;

    State.save(stateP);
    renderRows();
}

// Export CSV
function exportPhilippinesCsv() {
    if (!stateP.philippines.length) return alert("Nothing to export.");

    let csv = "Date,Description,Category,AmountPHP,AmountAUD\n";

    stateP.philippines.forEach(r => {
        csv += `"${r.date}","${r.reason}","${r.category}",${r.amountPhp},${r.amountAud}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "philippines_export.csv";
    a.click();
    URL.revokeObjectURL(url);
}

// ------------------------------
// Init
// ------------------------------
function init() {
    populateCategoryDropdown();
    renderRows();

    elsP.addBtn.onclick = () => {
        const date = elsP.date.value;
        if (!date) return alert("Choose a date.");

        const desc = elsP.desc.value.trim();
        if (!desc) return alert("Enter description.");

        const php = parseFloat(elsP.amount.value) || 0;
        const cat = elsP.category.value;

        stateP.philippines.push({
            date: normalisePhDate(date),
            reason: desc,
            amountPhp: php,
            amountAud: php * stateP.phpAudRate,
            category: cat
        });

        State.save(stateP);
        renderRows();

        elsP.desc.value = "";
        elsP.amount.value = "";
    };

    elsP.importBtn.onclick = importPhilippinesCsv;
    elsP.undoBtn.onclick = undoLastPhImport;
    elsP.exportBtn.onclick = exportPhilippinesCsv;

    elsP.undoDeleteBtn.onclick = () => {
        if (!phDeleteHistory.length) return alert("Nothing to undo.");

        const last = phDeleteHistory.pop();
        stateP.philippines.splice(last.index, 0, last.row);

        State.save(stateP);
        renderRows();
    };

    elsP.rateInput.oninput = () => {
        const v = parseFloat(elsP.rateInput.value);
        if (v > 0) {
            stateP.phpAudRate = v;
            State.save(stateP);
            renderRows();
        }
    };

    elsP.rateDisplay.textContent = `1 PHP = ${stateP.phpAudRate.toFixed(4)} AUD`;
}

document.addEventListener("DOMContentLoaded", init);
