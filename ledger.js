// ========================================================
// LEDGER.JS – CLEAN, COMPLETE, CATEGORY-SYNCED VERSION
// ========================================================

let state = State.load();
if (!state.ledger) state.ledger = [];
if (!state.categories) state.categories = [];
let lastImportBackup = [];

// --------------------------------------------------------
// Helpers
// --------------------------------------------------------

function formatAud(v) {
    if (isNaN(v)) return "$0.00";
    return "$" + Number(v).toFixed(2);
}

function parseDate(str) {
    if (!str) return "";

    // Accept: dd/mm/yyyy or "27 Nov 2025"
    if (str.includes("/")) return str;

    const d = new Date(str);
    if (!isNaN(d)) {
        return d.toLocaleDateString("en-GB"); // dd/mm/yyyy
    }
    return str;
}

// --------------------------------------------------------
// 1. Load category dropdown (fixes empty dropdown bug)
// --------------------------------------------------------

function loadCategoryDropdown() {
    const sel = document.getElementById("manualCategory");
    sel.innerHTML = "";

    if (!state.categories || state.categories.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No categories yet";
        sel.appendChild(opt);
        return;
    }

    state.categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.name;
        opt.textContent = cat.name;
        sel.appendChild(opt);
    });
}

// --------------------------------------------------------
// 2. Render Ledger Table
// --------------------------------------------------------

function renderLedger() {
    const tbody = document.querySelector("#ledger tbody");
    tbody.innerHTML = "";

    state.ledger.forEach((tx, index) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${tx.date || ""}</td>
            <td>${tx.description || ""}</td>
            <td>${tx.category || ""}</td>
            <td class="amount">${formatAud(tx.amount || 0)}</td>
            <td><button class="delete-btn" data-index="${index}">✕</button></td>
        `;

        tbody.appendChild(tr);
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.onclick = (e) => {
            const idx = Number(e.target.dataset.index);
            state.ledger.splice(idx, 1);
            State.save(state);
            renderLedger();
        };
    });
}

// --------------------------------------------------------
// 3. Manual Add
// --------------------------------------------------------

function setupManualAdd() {
    const btn = document.getElementById("addManualBtn");

    btn.onclick = () => {
        const date = parseDate(document.getElementById("manualDate").value.trim());
        const desc = document.getElementById("manualDescription").value.trim();
        const amount = Number(document.getElementById("manualAmount").value) || 0;
        const category = document.getElementById("manualCategory").value;

        if (!desc) return alert("Enter a description.");

        state.ledger.push({
            date,
            description: desc,
            amount,
            category
        });

        State.save(state);

        renderLedger();

        // clear fields
        document.getElementById("manualDescription").value = "";
        document.getElementById("manualAmount").value = "";
    };
}

// --------------------------------------------------------
// 4. Search
// --------------------------------------------------------

function setupSearch() {
    const searchInput = document.getElementById("ledgerSearch");

    searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll("#ledger tbody tr");

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(q) ? "" : "none";
        });
    });
}

// --------------------------------------------------------
// 5. CSV Import
// --------------------------------------------------------

function setupImport() {
    const importBtn = document.getElementById("importBtn");
    const loader = document.getElementById("loader");

    importBtn.onclick = () => {
        const fileInput = document.getElementById("csvFile");
        const file = fileInput.files[0];

        if (!file) return alert("Choose a CSV file.");

        loader.classList.remove("hidden");
        lastImportBackup = [...state.ledger]; // backup

        const reader = new FileReader();
        reader.onload = e => {
            const lines = e.target.result.split("\n").map(l => l.trim()).filter(l => l);

            lines.forEach((line, i) => {
                const parts = line.split(",");

                if (parts.length < 3) return;

                const date = parseDate(parts[0]);
                const desc = parts[1];
                const amount = Number(parts[2]) || 0;

                state.ledger.push({
                    date,
                    description: desc,
                    amount,
                    category: ""
                });
            });

            State.save(state);
            renderLedger();
            loader.classList.add("hidden");
            alert("Import complete.");
        };

        reader.readAsText(file);
    };

    // Undo Last Import
    document.getElementById("undoImportBtn").onclick = () => {
        if (!lastImportBackup.length) return alert("No import to undo.");

        state.ledger = [...lastImportBackup];
        State.save(state);

        renderLedger();
        alert("Last import undone.");
    };

    // Remove duplicates
    document.getElementById("removeDuplicatesBtn").onclick = () => {
        const unique = [];
        const seen = new Set();

        state.ledger.forEach(tx => {
            const key = tx.date + "|" + tx.description + "|" + tx.amount;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(tx);
            }
        });

        state.ledger = unique;
        State.save(state);
        renderLedger();
        alert("Duplicates removed.");
    };

    // Clear Ledger
    document.getElementById("clearLedgerBtn").onclick = () => {
        if (!confirm("Clear ALL ledger entries?")) return;

        state.ledger = [];
        State.save(state);
        renderLedger();
    };

    // Export Ledger
    document.getElementById("exportBtn").onclick = () => {
        const blob = new Blob([JSON.stringify(state.ledger, null, 2)], {
            type: "application/json"
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "ledger.json";
        a.click();
    };
}

// --------------------------------------------------------
// INIT
// --------------------------------------------------------

function initLedger() {
    loadCategoryDropdown();
    renderLedger();
    setupImport();
    setupManualAdd();
    setupSearch();
}

document.addEventListener("DOMContentLoaded", initLedger);
