// ===============================
// philippines.js – FINAL VERSION
// ===============================

// Load shared global state
let stateP = State.load();
let phDeleteHistory = [];

// Ensure required structures exist
if (!Array.isArray(stateP.philippines)) stateP.philippines = [];
if (!Array.isArray(stateP.phCategories)) stateP.phCategories = [];
if (typeof stateP.phpAudRate !== "number" || stateP.phpAudRate <= 0) {
    stateP.phpAudRate = 0.0259;
    State.save(stateP);
}

const elsP = {
    date: document.getElementById("phDate"),
    desc: document.getElementById("phDesc"),
    amount: document.getElementById("phAmount"),
    category: document.getElementById("phCategory"),
    addBtn: document.getElementById("addPhBtn"),
    newCat: document.getElementById("newPhCategory"),
    addCatBtn: document.getElementById("addPhCategoryBtn"),

    tableBody: document.getElementById("phTableBody"),

    rateInput: document.getElementById("phRateInput"),
    rateDisplay: document.getElementById("phRateDisplay"),
    rateNote: document.getElementById("phRateNote"),

    csvFile: document.getElementById("phCsvFile"),
    importBtn: document.getElementById("importPhCsvBtn"),
    undoBtn: document.getElementById("undoPhImportBtn"),
    exportBtn: document.getElementById("exportPhCsvBtn"),

    // Summary fields
    moneySent: document.getElementById("phMoneySent"),
    moneyEarned: document.getElementById("phMoneyEarned"),
    moneySpent: document.getElementById("phMoneySpent"),
    phNet: document.getElementById("phNet"),
    phLeft: document.getElementById("phLeft"),

    totalPHP: document.getElementById("phTotalPHP"),
    totalAUD: document.getElementById("phTotalAUD"),
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

function splitCsvLine(line) {
    const match = line.match(/(".*?"|[^,]+)/g);
    if (!match) return [];
    return match.map((col) => {
        col = col.trim();
        if (col.startsWith('"') && col.endsWith('"')) {
            col = col.slice(1, -1);
        }
        return col;
    });
}

function normalisePhDate(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatPHP(n) {
    return n.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
}

function formatAUD(n) {
    return n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

// ------------------------------
// Category Dropdown
// ------------------------------
function populateCategoryDropdown() {
    elsP.category.innerHTML = "";
    stateP.phCategories.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        elsP.category.appendChild(opt);
    });
}

function addNewPhCategory() {
    const v = elsP.newCat.value.trim();
    if (!v) return;

    if (!stateP.phCategories.includes(v)) {
        stateP.phCategories.push(v);
    }

    State.save(stateP);
    populateCategoryDropdown();
    renderRows();

    elsP.newCat.value = "";
}

// ------------------------------
// Summary Calculations
// ------------------------------
function computeTotals() {
    let sent = 0;
    let earned = 0;
    let spent = 0;

    let totalPHP = 0;
    let totalAUD = 0;

    (stateP.philippines || []).forEach((r) => {
        const php = r.amountPhp ?? 0;
        const aud = r.amountAud ?? 0;

        // Summaries
        if (aud < 0) spent += Math.abs(aud);
        if (aud > 0) earned += aud;

        // Totals
        totalPHP += php;
        totalAUD += aud;
    });

    elsP.moneySent.textContent = formatAUD(sent);
    elsP.moneyEarned.textContent = formatAUD(earned);
    elsP.moneySpent.textContent = formatAUD(spent);

    const net = earned - spent;
    elsP.phNet.textContent = formatAUD(net);
    elsP.phLeft.textContent = formatAUD(net);

    elsP.totalPHP.textContent = formatPHP(totalPHP);
    elsP.totalAUD.textContent = formatAUD(totalAUD);
}

// ------------------------------
// Table Rendering
// ------------------------------
function renderRows() {
    elsP.tableBody.innerHTML = "";

    const rows = [...stateP.philippines];

    rows.sort((a, b) => {
        const da = new Date(a.date);
        const db = new Date(b.date);
        return db - da;
    });

    rows.forEach((row, idx) => {
        const tr = document.createElement("tr");

        // Date
        const tdDate = document.createElement("td");
        tdDate.textContent = row.date || "";
        tr.appendChild(tdDate);

        // Description
        const tdDesc = document.createElement("td");
        const inputDesc = document.createElement("input");
        inputDesc.type = "text";
        inputDesc.value = row.reason || "";
        inputDesc.style.width = "95%";
        inputDesc.addEventListener("input", () => {
            row.reason = inputDesc.value;
            State.save(stateP);
        });
        tdDesc.appendChild(inputDesc);
        tr.appendChild(tdDesc);

        // Category
        const tdCat = document.createElement("td");
        const sel = document.createElement("select");

        stateP.phCategories.forEach((cat) => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.textContent = cat;
            if (row.category === cat) opt.selected = true;
            sel.appendChild(opt);
        });

        sel.addEventListener("change", () => {
            row.category = sel.value;
            State.save(stateP);
        });

        tdCat.appendChild(sel);
        tr.appendChild(tdCat);

        // PHP amount
        const tdPhp = document.createElement("td");
        const inputPhp = document.createElement("input");
        inputPhp.type = "number";
        inputPhp.step = "0.01";
        inputPhp.value = row.amountPhp ?? 0;
        inputPhp.style.width = "100px";

inputPhp.addEventListener("input", () => {
    const val = parseFloat(inputPhp.value) || 0;
    row.amountPhp = val;
    row.amountAud = val * stateP.phpAudRate;
    State.save(stateP);

    // do NOT re-render here (avoids losing focus)
    tdAud.textContent = formatAUD(row.amountAud);
});


        tdPhp.appendChild(inputPhp);
        tr.appendChild(tdPhp);

        // AUD amount
        const tdAud = document.createElement("td");
        tdAud.textContent = formatAUD(row.amountAud ?? 0);
        tr.appendChild(tdAud);

        // Delete
        const tdDel = document.createElement("td");
        const btn = document.createElement("button");
        btn.textContent = "✕";
        btn.className = "secondary";
btn.onclick = () => {
    // Identify real index (not the sorted index)
    const realIndex = stateP.philippines.indexOf(row);

    if (realIndex !== -1) {
        // Store for undo
        phDeleteHistory.push({
            index: realIndex,
            row: { ...row }
        });

        // Delete
        stateP.philippines.splice(realIndex, 1);
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
// CSV Import
// ------------------------------
function parsePhilippinesCsv(text, rate) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    const rows = [];

    lines.forEach((line, idx) => {
        const cols = splitCsvLine(line);
        if (!cols.length) return;
        if (idx === 0) return; // header

        const phpAmount = parseMoney(cols[4]);
        const bookDate = cols[6] || "";
        const desc = cols[12] || "PH transaction";

        rows.push({
            date: normalisePhDate(bookDate),
            reason: desc,
            amountPhp: phpAmount,
            amountAud: phpAmount * rate,
            category: "",
        });
    });

    return rows;
}

function importPhilippinesCsv() {
    const file = elsP.csvFile.files[0];
    if (!file) {
        alert("Please choose a CSV file first.");
        return;
    }

    const rate = stateP.phpAudRate;

    const reader = new FileReader();
    reader.onload = (e) => {
        // Save backup
        stateP.phLastImport = JSON.parse(JSON.stringify(stateP.philippines));

        const newRows = parsePhilippinesCsv(e.target.result, rate);
        if (!newRows.length) {
            alert("No transactions detected.");
            return;
        }

        stateP.philippines.push(...newRows);
        State.save(stateP);
        renderRows();
        alert("PH CSV imported.");
    };

    reader.readAsText(file);
}

// ------------------------------
// Undo Import
// ------------------------------
function undoLastPhImport() {
    if (!stateP.phLastImport) {
        alert("No previous import to undo.");
        return;
    }

    stateP.philippines = JSON.parse(JSON.stringify(stateP.phLastImport));
    delete stateP.phLastImport;
    State.save(stateP);
    renderRows();
    alert("Last PH import undone.");
}

// ------------------------------
// CSV Export
// ------------------------------
function exportPhilippinesCsv() {
    if (!stateP.philippines.length) {
        alert("No data to export.");
        return;
    }

    let csv = "Date,Description,Category,AmountPHP,AmountAUD\n";

    stateP.philippines.forEach((r) => {
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
// Exchange Rate Handling
// ------------------------------
function setRateFromInput() {
    const v = parseFloat(elsP.rateInput.value);
    if (v > 0) {
        stateP.phpAudRate = v;
        State.save(stateP);
        renderRows();
    }
}

function updateRateUI() {
    const r = stateP.phpAudRate;
    elsP.rateInput.value = r.toFixed(4);
    elsP.rateDisplay.textContent = `1 PHP = ${r.toFixed(4)} AUD`;
    elsP.rateNote.textContent = "Auto-loaded; you can edit this.";
}

// ------------------------------
// Init
// ------------------------------
function init() {
    populateCategoryDropdown();
    updateRateUI();
    renderRows();

    elsP.addBtn.onclick = () => {
        const date = elsP.date.value;
        const desc = elsP.desc.value.trim();
        const amt = parseFloat(elsP.amount.value) || 0;
        const cat = elsP.category.value;

        if (!date || !desc || isNaN(amt)) {
            alert("Enter date, description and amount.");
            return;
        }

        stateP.philippines.push({
    date: normalisePhDate(date),
    reason: desc,
    amountPhp: 0,
    amountAud: amt,
    category: cat,
});



        State.save(stateP);
        renderRows();

        elsP.desc.value = "";
        elsP.amount.value = "";
    };

    elsP.addCatBtn.onclick = addNewPhCategory;
    elsP.importBtn.onclick = importPhilippinesCsv;
    elsP.undoBtn.onclick = undoLastPhImport;
    elsP.exportBtn.onclick = exportPhilippinesCsv;
    elsP.rateInput.oninput = setRateFromInput;
}

document.addEventListener("DOMContentLoaded", init);
document.getElementById("undoPhDeleteBtn").onclick = () => {
    if (phDeleteHistory.length === 0) {
        alert("Nothing to undo.");
        return;
    }

    // Restore last deleted
    const last = phDeleteHistory.pop();
    stateP.philippines.splice(last.index, 0, last.row);

    State.save(stateP);
    renderRows();
};
