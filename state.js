// state.js – single source of truth for all pages

const KEY = 'tobyBudgetV1_categories_budget_ledger_v1';

// -----------------------------
// Default / empty state
// -----------------------------
function defaultState() {
  return {
    income: 0,
    housePct: 10,
    samalPct: 10,

    // Main AU budget categories
    categories: [],

    // Main AU ledger
    ledger: [],

    // Income entries
    incomes: [],

    // Philippines ledger rows
    philippines: [],

    // Philippines categories used by philippines.js
    phCategories: [],

    // Philippines budget categories used by ph-budget.js
    phBudgetCategories: [],

    // PHP → AUD rate
    phpAudRate: 0.0259,

    // Debts & investments
    investments: [],
    debts: [],
    debtPayments: [],

    version: 1
  };
}

// -----------------------------
// Load / Save helpers
// -----------------------------
function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return defaultState();
    }

    const parsed = JSON.parse(raw);
    const base = defaultState();

    const merged = {
      // base defaults
      ...base,
      // everything from storage
      ...parsed,

      // Ensure core arrays always exist and are arrays
      categories: Array.isArray(parsed.categories) ? parsed.categories : base.categories,
      ledger: Array.isArray(parsed.ledger) ? parsed.ledger : base.ledger,
      incomes: Array.isArray(parsed.incomes) ? parsed.incomes : base.incomes,

      philippines: Array.isArray(parsed.philippines) ? parsed.philippines : base.philippines,

      // PH categories for the ledger page
      phCategories: Array.isArray(parsed.phCategories)
        ? parsed.phCategories
        : base.phCategories,

      // PH budget categories for the PH budget page
      phBudgetCategories: Array.isArray(parsed.phBudgetCategories)
        ? parsed.phBudgetCategories
        : base.phBudgetCategories,

      investments: Array.isArray(parsed.investments) ? parsed.investments : base.investments,
      debts: Array.isArray(parsed.debts) ? parsed.debts : base.debts,
      debtPayments: Array.isArray(parsed.debtPayments) ? parsed.debtPayments : base.debtPayments,

      phpAudRate:
        typeof parsed.phpAudRate === 'number' && parsed.phpAudRate > 0
          ? parsed.phpAudRate
          : base.phpAudRate,

      version: typeof parsed.version === 'number' ? parsed.version : 1
    };

    return merged;
  } catch (e) {
    console.error('State.load – failed, using defaultState()', e);
    return defaultState();
  }
}

function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('State.save – failed', e);
  }
}

// -----------------------------
// Public API
// -----------------------------
class State {
  static load() {
    return loadState();
  }

  static save(newState) {
    saveState(newState);
  }
}
