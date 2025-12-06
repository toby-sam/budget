// ========================================================
// Toby Budget – Ledger.js (stable with CSV import + dup highlight)
// ========================================================

// ---- State bootstrap --------------------------------------------------------
let state = State.load() || {};
if (!Array.isArray(state.ledger)) state.ledger = [];
if (!Array.isArray(state.categories)) state.categories = [];
State.save(state);

// Used for "Undo last import"
let lastImportBackup = [];

// ---- Helpers ---------------------------------------------------------------

// Normalise weird whitespace (NBSP etc.)
function cleanSpaces(str) {
  if (!str) return "";
  return String(str)
    .replace(/[\u00A0\u2000-\u200F\u2028\u2029]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatAud(v) {
  const n = Number(v);
  if (isNaN(n)) return "$0.00";
  return "$" + n.toFixed(2);
}

// Parse CSV-style dates such as "8 Dec 2025" or "08 December 2025"
function parseCsvDate(str) {
  if (!str) return "";

  str = cleanSpaces(str);

  // Already ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split("/");
    return `${y}-${m}-${d}`;
  }

  // "8 Dec 2025" / "08 December 2025"
  const m = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    let [, day, monStr, year] = m;
    day = day.padStart(2, "0");
    const months = {
      jan: "01", january: "01",
      feb: "02", february: "02",
      mar: "03", march: "03",
      apr: "04", april: "04",
      may: "05",
      jun: "06", june: "06",
      jul: "07", july: "07",
      aug: "08", august: "08",
      sep: "09", sept: "09", september: "09",
      oct: "10", october: "10",
      nov: "11", november: "11",
      dec: "12", december: "12",
    };
    const mon = months[monStr.toLowerCase()];
    if (mon) return `${year}-${mon}-${day}`;
  }

  // Fallback: let Date try
  const d = new Date(str);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);

  return "";
}

// Normalise any internal date value to ISO yyyy-mm-dd
function normaliseDate(str) {
  if (!str) return "";
  str = cleanSpaces(str);

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split("/");
    return `${y}-${m}-${d}`;
  }

  const iso = parseCsvDate(str);
  if (iso) return iso;

  const d = new Date(str);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);

  return "";
}

// For now we just display the ISO date (matches your current layout)
function displayDate(str) {
  return str || "";
}

// ---- Category dropdown ------------------------------------------------------

function loadCategoryDropdown() {
  const sel = document.getElementById("manualCategory");
  if (!sel) return;

  sel.innerHTML = "";

  if (!Array.isArray(state.categories) || state.categories.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No categories yet";
    sel.appendChild(opt);
    return;
  }

  const sorted = [...state.categories].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  sorted.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.name;
    opt.textContent = cat.name;
    sel.appendChild(opt);
  });
}

// ---- Render ledger table (with duplicate highlight) ------------------------

function renderLedger() {
  const tbody = document.querySelector("#ledger tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Normalise dates & keep schema clean
  state.ledger = state.ledger.map(tx => ({
    ...tx,
    date: normaliseDate(tx.date),
  }));

  // Sort newest → oldest
  state.ledger.sort((a, b) => {
    const da = a.date || "";
    const db = b.date || "";
    return db.localeCompare(da);
  });

  // Duplicate detection (same date + same amount)
// Detect duplicates (same date + ABS amount — ignore + or -)
const seen = new Set();
const duplicates = new Set();

state.ledger.forEach(tx => {
    const key = `${tx.date}|${Math.abs(tx.amount)}`;
    if (seen.has(key)) duplicates.add(key);
    else seen.add(key);
});

  const hasCategories =
    Array.isArray(state.categories) && state.categories.length > 0;
  const sortedCats = hasCategories
    ? [...state.categories].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  state.ledger.forEach((tx, index) => {
    const tr = document.createElement("tr");
   const dupKey = `${tx.date}|${Math.abs(tx.amount)}`;
if (duplicates.has(dupKey)) {
    tr.style.color = "red";
    tr.style.fontWeight = "bold";
    tr.title = "Duplicate entry (amount sign ignored)";
}


    // Build category options
    let optionsHtml = "";
    if (hasCategories) {
      optionsHtml += sortedCats
        .map(
          cat => `
          <option value="${cat.name}" ${
            tx.category === cat.name ? "selected" : ""
          }>
            ${cat.name}
          </option>
        `
        )
        .join("");
      const unassigned = !tx.category;
      optionsHtml += `
        <option value="" ${unassigned ? "selected" : ""}>Unassigned</option>
      `;
    } else {
      optionsHtml = `<option value="">No categories yet</option>`;
    }

    tr.innerHTML = `
      <td>${displayDate(tx.date)}</td>
      <td>${tx.description || ""}</td>
      <td>
        <select class="ledger-category" data-index="${index}">
          ${optionsHtml}
        </select>
      </td>
      <td class="amount">${formatAud(tx.amount || 0)}</td>
      <td><button class="delete-btn" data-index="${index}">✕</button></td>
    `;

    tbody.appendChild(tr);
  });

  // Delete buttons
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = e => {
      const idx = Number(e.target.dataset.index);
      if (Number.isNaN(idx)) return;
      state.ledger.splice(idx, 1);
      State.save(state);
      renderLedger();
    };
  });

  // Category change handlers
  document.querySelectorAll(".ledger-category").forEach(sel => {
    sel.onchange = e => {
      const idx = Number(e.target.dataset.index);
      if (Number.isNaN(idx)) return;
      state.ledger[idx].category = e.target.value;
      State.save(state);
    };
  });
}

// ---- Manual Add ------------------------------------------------------------

function setupManualAdd() {
  const btn = document.getElementById("addManualBtn");
  if (!btn) return;

  btn.onclick = () => {
    const dateInput = document.getElementById("manualDate");
    const descInput = document.getElementById("manualDescription");
    const amountInput = document.getElementById("manualAmount");
    const catSelect = document.getElementById("manualCategory");

    const rawDate = cleanSpaces(dateInput.value);
    const desc = cleanSpaces(descInput.value);
    const amount = Number(amountInput.value) || 0;
    const category = catSelect ? catSelect.value : "";

    if (!desc) {
      alert("Enter a description.");
      return;
    }

    const isoDate = normaliseDate(rawDate);

    state.ledger.push({
      date: isoDate,
      description: desc,
      amount,
      category,
    });

    State.save(state);
    renderLedger();

    descInput.value = "";
    amountInput.value = "";
  };
}

// ---- Search ---------------------------------------------------------------

function setupSearch() {
  const input = document.getElementById("ledgerSearch");
  if (!input) return;

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();
    document.querySelectorAll("#ledger tbody tr").forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q)
        ? ""
        : "none";
    });
  });
}

// ---- CSV Import / Undo / Remove Dups / Clear / Export ----------------------

function setupImport() {
  const importBtn = document.getElementById("importBtn");
  const undoBtn = document.getElementById("undoImportBtn");
  const dupBtn = document.getElementById("removeDuplicatesBtn");
  const clearBtn = document.getElementById("clearLedgerBtn");
  const exportBtn = document.getElementById("exportBtn");
  const loader = document.getElementById("loader");

  if (!importBtn) return;

  // Import CSV
  importBtn.onclick = () => {
    const fileInput = document.getElementById("csvFile");
    const file = fileInput && fileInput.files[0];
    if (!file) {
      alert("Choose a CSV file first.");
      return;
    }

    lastImportBackup = JSON.parse(JSON.stringify(state.ledger));
    if (loader) loader.classList.remove("hidden");
    if (undoBtn) undoBtn.classList.remove("hidden");

    const reader = new FileReader();
    reader.onload = e => {
      try {
        let lines = String(e.target.result)
          .split("\n")
          .map(l => l.trim())
          .filter(l => l.length);

        // Skip header row if it contains "date"
        if (lines.length && lines[0].toLowerCase().includes("date")) {
          lines.shift();
        }

        lines.forEach(line => {
          // Small CSV helper: split, then recombine amount + optional category
          const parts = line.split(",");
          if (parts.length < 2) return;

          const rawDate = cleanSpaces(parts[0]);
          const desc = cleanSpaces(parts[1]);

          // columns 2..end contain amount + optional category
          const tail = parts.slice(2).join(",");
          const amountNumber =
            Number(tail.replace(/[^0-9.\-]/g, "")) || 0;

          const iso = normaliseDate(rawDate);

          state.ledger.push({
            date: iso,
            description: desc,
            amount: amountNumber,
            category: "", // start as Unassigned
          });
        });

        State.save(state);
        renderLedger();
        alert("Import complete ✓");
      } catch (err) {
        console.error("Import failed:", err);
        state.ledger = JSON.parse(JSON.stringify(lastImportBackup));
        State.save(state);
        renderLedger();
        alert("Import failed — ledger restored.");
      } finally {
        if (loader) loader.classList.add("hidden");
      }
    };

    reader.readAsText(file);
  };

  // Undo last import
  if (undoBtn) {
    undoBtn.onclick = () => {
      if (!lastImportBackup.length) {
        alert("No import to undo.");
        return;
      }
      state.ledger = JSON.parse(JSON.stringify(lastImportBackup));
      State.save(state);
      renderLedger();
      alert("Last import undone.");
    };
  }

  // Remove duplicates (hard delete) – uses date + description + amount
  if (dupBtn) {
    dupBtn.onclick = () => {
      const seen = new Set();
      const unique = [];

      state.ledger.forEach(tx => {
        const key = `${tx.date}|${tx.description}|${tx.amount}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(tx);
        }
      });

      state.ledger = unique;
      State.save(state);
      renderLedger();
      alert("Duplicate rows removed.");
    };
  }

  // Clear ledger
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (!confirm("Clear ALL ledger entries?")) return;
      state.ledger = [];
      State.save(state);
      renderLedger();
    };
  }

  // Export ledger to JSON
  if (exportBtn) {
    exportBtn.onclick = () => {
      const blob = new Blob([JSON.stringify(state.ledger, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "ledger.json";
      a.click();
    };
  }
}

// ---- Init ------------------------------------------------------------------

function initLedger() {
  loadCategoryDropdown();
  renderLedger();
  setupImport();
  setupManualAdd();
  setupSearch();
}

document.addEventListener("DOMContentLoaded", initLedger);
