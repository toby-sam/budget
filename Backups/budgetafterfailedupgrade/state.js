// state.js  (Master shared state manager for ALL pages)

const KEY = 'tobyBudgetV1_categories_budget_ledger_v1';

/**
 * Default state – single source of truth
 */
function defaultState() {
  return {
    income: 0,
    housePct: 10,
    samalPct: 10,

    categories: [],    // Ledger categories (Australia)
    ledger: [],        // Ledger transactions (Australia)
    incomes: [],       // Income entries

    philippines: [],   // Philippines transactions (AUD + PHP)
    phCategories: [],  // Philippines category list
    phpAudRate: 0.0259,// Exchange rate

    investments: [],   // Investments page
    debts: [],         // Optional future debts page

    version: 1         // For upgrades later
  };
}

/**
 * Load global state safely
 */
function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();

    const parsed = JSON.parse(raw);
    const base = defaultState();

    // Merge defaults to ensure NO FIELD is ever missing
    return {
      ...base,
      ...parsed,

      // Arrays must be arrays
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
      incomes: Array.isArray(parsed.incomes) ? parsed.incomes : [],
      philippines: Array.isArray(parsed.philippines) ? parsed.philippines : [],
      phCategories: Array.isArray(parsed.phCategories) ? parsed.phCategories : [],
      investments: Array.isArray(parsed.investments) ? parsed.investments : [],
      debts: Array.isArray(parsed.debts) ? parsed.debts : []
    };
  } catch (e) {
    console.error("Failed to load state:", e);
    return defaultState();
  }
}

/**
 * Save global state safely (always full object)
 */
function saveState(newState) {
  try {
    const base = defaultState();
    const merged = { ...base, ...newState };
    localStorage.setItem(KEY, JSON.stringify(merged));
  } catch (e) {
    console.error("Failed to save state:", e);
  }
}

/**
 * Export helpers
 */
window.State = {
  load: loadState,
  save: saveState,
  defaults: defaultState,
  KEY
};
