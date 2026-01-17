// =============================================
// sam-ledger.js – Sam Business Ledger (AUD)
// =============================================

// Load global state
let stateS = State.load();
let samDeleteHistory = [];

// Ensure array exists
if (!Array.isArray(stateS.samLedger)) stateS.samLedger = [];

// Sam Budget Categories ONLY (read-only source for category dropdown)
if (!Array.isArray(stateS.samBudgetCategories)) stateS.samBudgetCategories = [];

// ------------------------------
// Elements
// ------------------------------
const elsS = {
    date: document.getElementById("samDate"),
    desc: document.getElementById("samDesc"),
    amount: document.getElementById("samAmount"),
    category: document.getElementById("samCategory"),
    addBtn: document.getElementById("addSamBtn"),

    tableBody: document.getElementById("samTableBody"),

    csvFile: document.getElementById("samCsvFile"),
    importBtn: document.getElementById("importSamCsvBtn"),
    undoBtn: document.getElementById("undoSamImportBtn"),
    exportBtn: document.getElementById("exportSamCsvBtn"),

    undoDeleteBtn: document.getElementById("undoSamDeleteBtn")
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

function formatAUD(n) {
    return n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

function normaliseSamDate(str) {
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
// Category Dropdown – READ ONLY from Sam Budget
// ------------------------------
function populateCategoryDropdown() {
    elsS.category.innerHTML = "";

    [...stateS.samBudgetCategories]
        .sort((a,b) => a.name.localeCompare(b.name))
        .forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.name;
            opt.textContent = cat.name;
            elsS.category.appendChild(opt);
        });
}

// ------------------------------
// Summary Computation
// ------------------------------
function computeTotals() {
    let incomeAUD = 0;
    let expensesAUD = 0;
    let totalEntries = stateS.samLedger.length;

    stateS.samLedger.forEach(r => {
        const aud = r.amountAud || 0;
        const cat = r.category?.toLowerCase() || "";

        // Income category
        if (cat === "income") {
            incomeAUD += aud;
        } else {
            // Everything else is an expense
            expensesAUD += aud;
        }
    });

    // Calculate Net
    let netAUD = incomeAUD - expensesAUD;

    // UPDATE UI DISPLAY
    document.getElementById("sam_income").textContent = formatAUD(incomeAUD);
    document.getElementById("sam_expenses").textContent = formatAUD(expensesAUD);
    document.getElementById("sam_net").textContent = formatAUD(netAUD);
    document.getElementById("sam_total_entries").textContent = totalEntries;
}

// ------------------------------
// Render Ledger Table
// ------------------------------
function renderRows() {
    elsS.tableBody.innerHTML = "";

    const rows = [...stateS.samLedger].sort(
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
            State.save(stateS);
        };
        tdDesc.appendChild(inpDesc);
        tr.appendChild(tdDesc);

        // Category (Sam Budget only)
        const tdCat = document.createElement("td");
        const sel = document.createElement("select");

        // Sort alphabetically before building list
        const sortedCats = [...stateS.samBudgetCategories].sort((a,b) => 
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
            State.save(stateS);
            computeTotals();
        };

        tdCat.appendChild(sel);
        tr.appendChild(tdCat);

        // AUD amount
        const tdAud = document.createElement("td");
        const inpAud = document.createElement("input");
        inpAud.type = "number";
        inpAud.step = "0.01";
        inpAud.value = row.amountAud || 0;
        inpAud.oninput = () => {
            row.amountAud = parseFloat(inpAud.value) || 0;
            State.save(stateS);
            computeTotals();
        };
        tdAud.appendChild(inpAud);
        tr.appendChild(tdAud);

        // Delete button
        const tdDel = document.createElement("td");
        const btn = document.createElement("button");
        btn.textContent = "✕";
        btn.className = "secondary";
        btn.onclick = () => {
            const idx = stateS.samLedger.indexOf(row);
            if (idx !== -1) {
                samDeleteHistory.push({ index: idx, row: { ...row } });
                stateS.samLedger.splice(idx, 1);
                State.save(stateS);
                renderRows();
            }
        };
        tdDel.appendChild(btn);
        tr.appendChild(tdDel);

        elsS.tableBody.appendChild(tr);
    });

    computeTotals();
}

// ------------------------------
// CSV Import
// ------------------------------
function parseSamCsv(text) {
    const rows = [];
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");

    lines.forEach((line, idx) => {
        if (idx === 0) return; // Skip header

        const cols = line.split(",");

        const aud = parseMoney(cols[2] || cols[3]); // Adjust based on your CSV format
        const date = cols[0];
        const desc = cols[1] || "Sam Transaction";

        rows.push({
            date: normaliseSamDate(date),
            reason: desc,
            category: "",  // user assigns later
            amountAud: aud
        });
    });

    return rows;
}

function importSamCsv() {
    const file = elsS.csvFile.files[0];
    if (!file) return alert("Choose a CSV file.");

    const reader = new FileReader();
    reader.onload = e => {
        stateS.samLastImport = [...stateS.samLedger];
        const rows = parseSamCsv(e.target.result);
        stateS.samLedger.push(...rows);
        State.save(stateS);
        renderRows();
        alert("CSV imported.");
    };
    reader.readAsText(file);
}

// Undo last CSV import
function undoLastSamImport() {
    if (!stateS.samLastImport) return alert("Nothing to undo.");

    stateS.samLedger = [...stateS.samLastImport];
    delete stateS.samLastImport;

    State.save(stateS);
    renderRows();
}

// Export CSV
function exportSamCsv() {
    if (!stateS.samLedger.length) return alert("Nothing to export.");

    let csv = "Date,Description,Category,AmountAUD\n";

    stateS.samLedger.forEach(r => {
        csv += `"${r.date}","${r.reason}","${r.category}",${r.amountAud}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "sam_business_export.csv";
    a.click();
    URL.revokeObjectURL(url);
}

// ------------------------------
// Init
// ------------------------------
function init() {
    populateCategoryDropdown();
    renderRows();

    elsS.addBtn.onclick = () => {
        const date = elsS.date.value;
        if (!date) return alert("Choose a date.");

        const desc = elsS.desc.value.trim();
        if (!desc) return alert("Enter description.");

        const aud = parseFloat(elsS.amount.value) || 0;
        const cat = elsS.category.value;

        stateS.samLedger.push({
            date: normaliseSamDate(date),
            reason: desc,
            amountAud: aud,
            category: cat
        });

        State.save(stateS);
        renderRows();

        elsS.desc.value = "";
        elsS.amount.value = "";
    };

    elsS.importBtn.onclick = importSamCsv;
    elsS.undoBtn.onclick = undoLastSamImport;
    elsS.exportBtn.onclick = exportSamCsv;

    elsS.undoDeleteBtn.onclick = () => {
        if (!samDeleteHistory.length) return alert("Nothing to undo.");

        const last = samDeleteHistory.pop();
        stateS.samLedger.splice(last.index, 0, last.row);

        State.save(stateS);
        renderRows();
    };
}

document.addEventListener("DOMContentLoaded", init);
