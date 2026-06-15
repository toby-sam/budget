// ====================================================================
//  BUDGET.JS – FINAL VERSION (AU + PH + AUD conversions + Savings)
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
if (!state.samLedger) state.samLedger = [];
if (!state.samBudgetCategories) state.samBudgetCategories = [];
if (!state.samalSavings) state.samalSavings = 0;
if (!state.auSavings) state.auSavings = 0;
if (!Array.isArray(state.solect)) state.solect = [];
if (!Array.isArray(state.solectBudgetCategories)) state.solectBudgetCategories = [];
if (!state.solAudRate) state.solAudRate = 0.0259;
if (!Array.isArray(state.debts)) state.debts = [];
if (!Array.isArray(state.debtPayments)) state.debtPayments = [];


// ------------------------------
// Format Helpers
// ------------------------------
function formatAud(n){
    if(isNaN(n)) n = 0;
    return n.toLocaleString("en-AU",{ style:"currency",currency:"AUD"});
}


// ------------------------------
// Get total income AU + PH (direct, no HTML dependency)
// ------------------------------
function getMonthlyIncomeDirect(){
    let total = 0;
    let badIncome = 0;

    state.ledger.forEach(r=>{
        if(r.category?.toLowerCase()==="income")
            total += Math.abs(r.amount||0);
        if(r.category?.toLowerCase()==="bad income")
            badIncome += Math.abs(r.amount||0);
    });

    state.philippines.forEach(r=>{
        if(r.category?.toLowerCase()==="income")
            total += Math.abs(r.amountAud||0);
    });

    return total - badIncome;
}


// ------------------------------ COMPUTATION FUNCTIONS ------------------------------
function computeAuLedgerTotal(){ return state.ledger.reduce((s,e)=>s+(e.amount||0),0); }

function computeAuCost(){
    return state.ledger.reduce((sum,e)=>{
        if(e.category?.toLowerCase()==="income") return sum;
        return sum + Math.abs(e.amount||0);
    },0);
}

function computePhCostAud(){
    return state.philippines.reduce((sum, t) => {
        if (t.category?.toLowerCase() === "income") return sum;
        return sum + Math.abs(t.amountAud || 0);
    }, 0);
}

function computeSamCostAud(){
    return state.samLedger.reduce((sum, t) => {
        if (t.category?.toLowerCase() === "income") return sum;
        return sum + Math.abs(t.amountAud || 0);
    }, 0);
}

function computePhSpendPhp(){
    return state.philippines.reduce((s,t)=>s+(t.amountPhp||0),0);
}

function computePhSpendAud(){ return computePhSpendPhp()*state.phpAudRate; }

function computeAuBudgetTotal(){
    return state.categories.reduce((s,c)=>{
        const catNameLower = c.name?.toLowerCase() || "";
        // Exclude income and bad income from budget totals
        if (catNameLower === "income" || catNameLower === "bad income") return s;
        return s + (c.budgetMonthly||0);
    },0);
}

function computePhBudgetTotalPhp(){
    return state.phBudgetCategories.reduce((s,c)=>s+(c.budgetMonthly||0),0);
}

function computeSamBudgetTotalAud(){
    return state.samBudgetCategories.reduce((s,c)=>s+(c.budgetMonthly||0),0);
}

function computeProfitLoss(income,spend){ return income-spend; }

function computePredictedTotal(){
    const actuals = computeActualsByCategory();
    let predictedTotal = 0;
    
    state.categories.forEach(cat => {
        const catNameLower = cat.name.toLowerCase();
        
        // Skip income and bad income categories
        if (catNameLower === "income" || catNameLower === "bad income") return;
        
        const budget = cat.budgetMonthly || 0;
        const actual = Math.abs(actuals[cat.name] || 0);
        const difference = budget - actual;
        
        // If under budget (difference >= 0), use budget
        // If over budget (difference < 0), use actual
        if (difference >= 0) {
            predictedTotal += budget;
        } else {
            predictedTotal += actual;
        }
    });
    
    return predictedTotal;
}


// ====================================================================
// 🔥 RENDER SUMMARY (TOP DASHBOARD)
// ====================================================================
function computeSummary(){

const els = {
    summaryIncome: document.getElementById("summaryIncome"),
    predictedProf: document.getElementById("predictedProf"),
    summaryAuLedgerTotal: document.getElementById("summaryAuLedgerTotal"),
    summaryTotalSpend: document.getElementById("summaryTotalSpend"),
    summaryProfitLoss: document.getElementById("summaryProfitLoss"),
    summaryTotalBudget: document.getElementById("summaryTotalBudget"),
    summaryTotalPhBudget: document.getElementById("summaryTotalPhBudget"),
    summaryTotalSamBudget: document.getElementById("summaryTotalSamBudget"),
    summaryCombinedBudget: document.getElementById("summaryCombinedBudget"),
    
    /* 🔥 Missing UI Bindings — These FIX the problem */
    summaryPhCost: document.getElementById("summaryPhCost"),
    summarySamCost: document.getElementById("summarySamCost"),
    summaryPredictedTotal: document.getElementById("summaryPredictedTotal"),
    grandPredictedTotal: document.getElementById("grandPredictedTotal"),
    summaryLedger: document.getElementById("summaryLedger"),        // optional future use
    summaryPhilippines: document.getElementById("summaryPhilippines"), // optional future use

    summaryAuProfit: document.getElementById("summaryAuProfit"),
    summarySoftwareProfit: document.getElementById("summarySoftwareProfit"),
    summaryPhProfit: document.getElementById("summaryPhProfit"),
    summarySolectProfit: document.getElementById("summarySolectProfit"),
    summaryDebtPaid: document.getElementById("summaryDebtPaid"),
    summaryDebtBalance: document.getElementById("summaryDebtBalance")
};

    const income = getMonthlyIncomeDirect();
    const auCost = computeAuCost();
    const phCostAud = computePhCostAud();
    const samCostAud = computeSamCostAud();

    const auBudgetAud = computeAuBudgetTotal();
    const phBudgetAud = computePhBudgetTotalPhp()*state.phpAudRate;
    const samBudgetAud = computeSamBudgetTotalAud();

    const combinedBudgetAud = auBudgetAud + phBudgetAud + samBudgetAud;
    const totalSpendAud = auCost + phCostAud + samCostAud;

    const predictedTotal = computePredictedTotal();
    const grandPredictedTotal = predictedTotal + phBudgetAud + samBudgetAud;
    const predictedResult = income - grandPredictedTotal;

    // 🔥 WHATS LEFT = Income - Grand Predicted Total - Savings
    const whatsLeft = income - grandPredictedTotal - (state.auSavings || 0);

    // 🔥 CALCULATE TOTAL RUNNING TOTAL (AU + PH in AUD)
    // Exclude income and use Math.abs() to match ledger running total
    const auRunningTotal = state.ledger.reduce((sum, tx) => {
        if (tx.category?.toLowerCase() === "income") return sum;
        return sum + Math.abs(tx.amount || 0);
    }, 0);
    // Exclude "income" category from PH running total
    const phRunningTotalPhp = state.philippines.reduce((sum, tx) => {
        const cat = tx.category?.toLowerCase() || "";
        return cat !== "income" ? sum + (tx.amountPhp || 0) : sum;
    }, 0);
    const phRunningTotalAud = phRunningTotalPhp * state.phpAudRate;
    const totalRT = auRunningTotal + phRunningTotalAud;

    // ---- Write to UI ----
    if(els.summaryIncome) els.summaryIncome.textContent = formatAud(income);
    if(els.summaryTotalSpend) els.summaryTotalSpend.textContent = formatAud(totalSpendAud);
    
    if(els.summaryTotalBudget) els.summaryTotalBudget.textContent = formatAud(auBudgetAud);
    if(els.summaryTotalPhBudget) els.summaryTotalPhBudget.textContent = formatAud(phBudgetAud);
    if(els.summaryTotalSamBudget) els.summaryTotalSamBudget.textContent = formatAud(samBudgetAud);
    if(els.summaryPredictedTotal) els.summaryPredictedTotal.textContent = formatAud(predictedTotal);
    if(els.grandPredictedTotal) els.grandPredictedTotal.textContent = formatAud(grandPredictedTotal);
    if(els.summaryCombinedBudget) els.summaryCombinedBudget.textContent = formatAud(combinedBudgetAud);
    if(els.summaryProfitLoss) els.summaryProfitLoss.textContent = formatAud(predictedResult);
    if(els.predictedProf) els.predictedProf.textContent = formatAud(predictedResult);
    // Update Ledger Totals
    if (els.summaryAuLedgerTotal) els.summaryAuLedgerTotal.textContent = formatAud(auCost);
    if (els.summaryPhCost) els.summaryPhCost.textContent = formatAud(phCostAud);
    if (els.summarySamCost) els.summarySamCost.textContent = formatAud(samCostAud);
    if (els.summaryTotalRT) els.summaryTotalRT.textContent = formatAud(totalRT);

    document.getElementById("remainingAfterSavings").textContent = formatAud(whatsLeft);

    // ---- AU Profit = Monthly Income − AU Predicted Total ----
    const auProfit = income - predictedTotal;
    if (els.summaryAuProfit) els.summaryAuProfit.textContent = formatAud(auProfit);

    // ---- Software Profit (Sam P/L in AUD) = sam income − sam actual expenses ----
    let samIncomeAud = 0;
    (state.samLedger || []).forEach(tx => {
        if (tx.category === "Income") samIncomeAud += (tx.amountAud || 0);
    });
    const softwareProfit = samIncomeAud - samCostAud;
    if (els.summarySoftwareProfit) els.summarySoftwareProfit.textContent = formatAud(softwareProfit);

    // ---- PH Profit = (ph income − ph budget) × PHP→AUD rate ----
    let phIncomePhp = 0;
    (state.philippines || []).forEach(tx => {
        if (tx.category === "AU_Income" || tx.category === "Income") {
            phIncomePhp += (tx.amountPhp || 0);
        }
    });
    const phFilteredBudget = state.phBudgetCategories
        .filter(c => c.name !== "AU_Income" && c.name !== "Income")
        .reduce((s, c) => s + (c.budgetMonthly || 0), 0);
    const phProfitAud = (phIncomePhp - phFilteredBudget) * state.phpAudRate;
    if (els.summaryPhProfit) els.summaryPhProfit.textContent = formatAud(phProfitAud);

    // ---- Solect Profit = (solect income − solect budget) × PHP→AUD rate ----
    let solectIncomePhp = 0;
    (state.solect || []).forEach(tx => {
        if (tx.category === "AU_Income" || tx.category === "Income") {
            solectIncomePhp += (tx.amountSOL || 0);
        }
    });
    const solectFilteredBudget = state.solectBudgetCategories
        .filter(c => c.name !== "AU_Income" && c.name !== "Income")
        .reduce((s, c) => s + (c.budgetMonthly || 0), 0);
    const solectProfitAud = (solectIncomePhp - solectFilteredBudget) * state.phpAudRate;
    if (els.summarySolectProfit) els.summarySolectProfit.textContent = formatAud(solectProfitAud);

    // ---- Debt Paid (sum of actuals for debt-related ledger categories) ----
    const parseDebtMoney = v => {
        if (typeof v === "number") return v;
        if (!v) return 0;
        const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
        return isNaN(n) ? 0 : n;
    };
    const debtCategoryNames = ["Afterpay", "CAR", "Cole CC", "Fines", "Latitude - Judz", "Latitude - Toby", "zip"];
    const actualsForDebt = computeActualsByCategory();
    const actualsLower = {};
    Object.keys(actualsForDebt).forEach(k => { actualsLower[k.toLowerCase()] = actualsForDebt[k]; });
    const totalDebtPaid = debtCategoryNames.reduce(
        (s, name) => s + Math.abs(actualsLower[name.toLowerCase()] || 0),
        0
    );
    const totalDebt = state.debts.reduce((s, d) => s + parseDebtMoney(d.total), 0);
    const debtBalance = totalDebt - totalDebtPaid;
    if (els.summaryDebtPaid) els.summaryDebtPaid.textContent = formatAud(totalDebtPaid);
    if (els.summaryDebtBalance) els.summaryDebtBalance.textContent = formatAud(debtBalance);

    // ---- Overall Budget Status (total spend vs total budget) ----
    const budgetDiff = totalSpendAud - combinedBudgetAud;
    const statusEl = document.getElementById("summaryBudgetStatus");
    if (statusEl) {
        if (budgetDiff > 0) {
            statusEl.textContent = `Over by ${formatAud(budgetDiff)}`;
            statusEl.style.background = "#dc3545";
            statusEl.style.color = "white";
        } else if (budgetDiff < 0) {
            statusEl.textContent = `Under by ${formatAud(Math.abs(budgetDiff))}`;
            statusEl.style.background = "#28a745";
            statusEl.style.color = "white";
        } else {
            statusEl.textContent = "On Budget";
            statusEl.style.background = "#007bff";
            statusEl.style.color = "white";
        }
        statusEl.style.fontWeight = "bold";
    }

    // ---- Over Budget tally (count + total overspend across categories) ----
    const overBudgetActuals = computeActualsByCategory();
    let overCount = 0, overTotal = 0;
    const overItems = [];
    state.categories.forEach(cat => {
        const catNameLower = cat.name?.toLowerCase() || "";
        if (catNameLower === "income" || catNameLower === "bad income") return;
        const budget = cat.budgetMonthly || 0;
        const actual = Math.abs(overBudgetActuals[cat.name] || 0);
        if (actual > budget) {
            overCount++;
            overTotal += (actual - budget);
            overItems.push({ name: cat.name, over: actual - budget });
        }
    });
    const overEl = document.getElementById("summaryOverBudget");
    if (overEl) {
        if (overCount > 0) {
            overEl.textContent = `${overCount} over by ${formatAud(overTotal)}`;
            overEl.style.background = "#dc3545";
            overEl.style.color = "white";
            overEl.title = overItems
                .sort((a, b) => b.over - a.over)
                .map(i => `${i.name}: ${formatAud(i.over)} over`)
                .join("\n");
            overEl.style.cursor = "help";
        } else {
            overEl.textContent = "None";
            overEl.style.background = "";
            overEl.style.color = "";
            overEl.title = "";
            overEl.style.cursor = "";
        }
        overEl.style.fontWeight = "bold";
    }

    // push input values back
    document.getElementById("auSavingInput").value   = state.auSavings;

}   // <<<<<< FIXED — THIS WAS MISSING


// ====================================================================
// CATEGORY TABLES (UNCHANGED)
// ====================================================================
function computeActualsByCategory(){
    const map={};
    state.ledger.forEach(e=>{
        if(!e.category) return;
        if(!map[e.category]) map[e.category]=0;
        if(e.category.toLowerCase()==="income") map[e.category]+=Math.abs(e.amount);
        else map[e.category]-=Math.abs(e.amount);
    });
    return map;
}

function renderCategories(){
    const body=document.querySelector("#categoriesTable tbody");
    body.innerHTML="";
    const actuals=computeActualsByCategory();

    [...state.categories].sort((a,b)=>a.name.localeCompare(b.name)).forEach(cat=>{
        const idx=state.categories.findIndex(c=>c.name===cat.name);
        if(idx==-1) return;

        const catNameLower = cat.name.toLowerCase();
        const isIncome = catNameLower === "income" || catNameLower === "bad income";
        
        // For income: positive difference means earning MORE than budget (good)
        // For expenses: positive difference means spending LESS than budget (good)
        const budget = cat.budgetMonthly || 0;
        const actual = Math.abs(actuals[cat.name] || 0);
        const difference = isIncome ? (actual - budget) : (budget - actual);
        
        const isOnBudget = difference === 0;
        const isGood = difference > 0;
        const statusText = isOnBudget ? "On Budget" : (isGood ? (isIncome ? "Over Budget" : "Under Budget") : (isIncome ? "Under Budget" : "Over Budget"));
        const statusClass = isOnBudget ? "" : (isGood ? "status-good" : "status-bad");
        const statusStyle = isOnBudget ? ' style="color:#007bff;font-weight:bold;"' : '';

        const tr=document.createElement("tr");
        tr.innerHTML=`
            <td>${cat.name}</td>
            <td><input type="number" step="0.01" value="${budget}" style="width:90px"
                oninput="state.categories[${idx}].budgetMonthly=parseFloat(this.value)||0;State.save(state);"
                onblur="State.save(state);renderCategories();computeSummary();"></td>
            <td class="amount">${formatAud(actual)}</td>
            <td class="amount">${formatAud(difference)}</td>
            <td class="${statusClass}"${statusStyle}>
                ${statusText}
            </td>
            <td><button onclick="state.categories.splice(${idx},1);State.save(state);renderCategories();computeSummary();">✕</button></td>`;
        body.appendChild(tr);
    });
}


// ====================================================================
// INIT
// ====================================================================
function init(){
    computeSummary();
    renderCategories();



    document.getElementById("auSavingInput").oninput = e=>{
        state.auSavings=parseFloat(e.target.value)||0; State.save(state); computeSummary();
    };

    // 🔥 ADD CATEGORY
    document.getElementById("addCategoryBtn").onclick = () => {
        const nameInput = document.getElementById("newCategoryName");
        const monthlyInput = document.getElementById("newCategoryMonthly");
        
        const name = (nameInput.value || "").trim();
        const monthly = parseFloat(monthlyInput.value) || 0;
        
        if (!name) {
            alert("Please enter a category name.");
            return;
        }
        
        // Check for duplicates
        if (state.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            alert("Category already exists.");
            return;
        }
        
        // Add new category
        state.categories.push({
            name: name,
            budgetMonthly: monthly
        });
        
        State.save(state);
        
        // Clear inputs
        nameInput.value = "";
        monthlyInput.value = "";
        
        // Refresh display
        renderCategories();
        computeSummary();
    };

}

document.addEventListener("DOMContentLoaded", init);
