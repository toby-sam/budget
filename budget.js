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
if (!state.samalSavings) state.samalSavings = 0;
if (!state.auSavings) state.auSavings = 0;


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

    state.ledger.forEach(r=>{
        if(r.category?.toLowerCase()==="income")
            total += Math.abs(r.amount||0);
    });

    state.philippines.forEach(r=>{
        if(r.category?.toLowerCase()==="income")
            total += Math.abs(r.amountAud||0);
    });

    return total;
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

function computePhSpendPhp(){
    return state.philippines.reduce((s,t)=>s+(t.amountPhp||0),0);
}

function computePhSpendAud(){ return computePhSpendPhp()*state.phpAudRate; }

function computeAuBudgetTotal(){
    return state.categories.reduce((s,c)=>s+(c.budgetMonthly||0),0);
}

function computePhBudgetTotalPhp(){
    return state.phBudgetCategories.reduce((s,c)=>s+(c.budgetMonthly||0),0);
}

function computeProfitLoss(income,spend){ return income-spend; }


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
    summaryCombinedBudget: document.getElementById("summaryCombinedBudget"),
    
    /* 🔥 Missing UI Bindings — These FIX the problem */
    summaryPhCost: document.getElementById("summaryPhCost"),        // ← NEW
    summaryLedger: document.getElementById("summaryLedger"),        // optional future use
    summaryPhilippines: document.getElementById("summaryPhilippines") // optional future use
};

    const income = getMonthlyIncomeDirect();
    const auCost = computeAuCost();
    const phCostAud = computePhCostAud();

    const auBudgetAud = computeAuBudgetTotal();
    const phBudgetAud = computePhBudgetTotalPhp()*state.phpAudRate;

    const combinedBudgetAud = auBudgetAud + phBudgetAud;
    const totalSpendAud = auCost + phCostAud;

    const predictedResult = income - combinedBudgetAud;

    // 🔥 SAVINGS ADJUSTMENT
    const totalSavings = (state.samalSavings||0) + (state.auSavings||0);
    const remainingAfterSavings = predictedResult - totalSavings;

    // ---- Write to UI ----
    if(els.summaryIncome) els.summaryIncome.textContent = formatAud(income);
    if(els.summaryTotalSpend) els.summaryTotalSpend.textContent = formatAud(totalSpendAud);
    
    if(els.summaryTotalBudget) els.summaryTotalBudget.textContent = formatAud(auBudgetAud);
    if(els.summaryTotalPhBudget) els.summaryTotalPhBudget.textContent = formatAud(phBudgetAud);
    if(els.summaryCombinedBudget) els.summaryCombinedBudget.textContent = formatAud(combinedBudgetAud);
    if(els.summaryProfitLoss) els.summaryProfitLoss.textContent = formatAud(predictedResult);
    if(els.predictedProf) els.predictedProf.textContent = formatAud(predictedResult);
    // Update Ledger Totals
    if (els.summaryAuLedgerTotal) els.summaryAuLedgerTotal.textContent = formatAud(auCost);
    if (els.summaryPhCost) els.summaryPhCost.textContent = formatAud(phCostAud);

    document.getElementById("remainingAfterSavings").textContent = formatAud(remainingAfterSavings);

    // push input values back
    document.getElementById("samalSavingInput").value = state.samalSavings;
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

        const tr=document.createElement("tr");
        tr.innerHTML=`
            <td>${cat.name}</td>
            <td><input type="number" step="0.01" value="${cat.budgetMonthly||0}" style="width:90px"
                oninput="state.categories[${idx}].budgetMonthly=parseFloat(this.value)||0;State.save(state);"
                onblur="State.save(state);renderCategories();computeSummary();"></td>
            <td class="amount">${formatAud(actuals[cat.name]||0)}</td>
            <td class="amount">${formatAud((cat.budgetMonthly||0)-Math.abs(actuals[cat.name]||0))}</td>
<td class="${
    ((cat.budgetMonthly||0)-Math.abs(actuals[cat.name]||0))>=0 ? "status-good" : "status-bad"
}">
    ${((cat.budgetMonthly||0)-Math.abs(actuals[cat.name]||0))>=0 ? "Under Budget" : "Over Budget"}
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

    document.getElementById("samalSavingInput").oninput = e=>{
        state.samalSavings=parseFloat(e.target.value)||0; State.save(state); computeSummary();
    };

    document.getElementById("auSavingInput").oninput = e=>{
        state.auSavings=parseFloat(e.target.value)||0; State.save(state); computeSummary();
    };

// 🔥 SAVE BACKUP
// 🔥 SAVE BACKUP WITH CUSTOM FILENAME
document.getElementById("saveBackupBtn").onclick = () => {
    // Ask user for name
    let name = prompt("Enter a name for your backup:", "");

    // If user enters nothing → auto create a beautiful timestamped filename
    if (!name || !name.trim()) {
        const now = new Date();
        const stamp = now.toISOString().split("T")[0]; // YYYY-MM-DD
        name = `BudgetBackup_${stamp}`;
    }

    // Ensure .json extension
    if (!name.toLowerCase().endsWith(".json")) {
        name = name + ".json";
    }

    // Convert + download
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: "application/json" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
};

// 🔥 LOAD BACKUP
document.getElementById("loadBackupBtn").onclick = () =>
    document.getElementById("loadBackupInput").click();

document.getElementById("loadBackupInput").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = I => {
        const data = JSON.parse(I.target.result);
        Object.assign(state, data);   // merge imported values
        State.save(state);
        computeSummary();
        renderCategories();
        alert("Backup restored!");
    };
    reader.readAsText(file);
};

// 🔄 REFRESH
document.getElementById("refreshBtn").onclick = () => {
    computeSummary();
    renderCategories();
};

}

document.addEventListener("DOMContentLoaded", init);
