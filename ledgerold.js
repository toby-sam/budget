// ========================================================
// LEDGER.JS – FINAL STABLE VERSION WITH DATE FIX
// ========================================================

let state = State.load();
if (!state.ledger) state.ledger = [];
if (!state.categories) state.categories = [];
let lastImportBackup = [];

// --------------------------------------------------------
// Helpers
// --------------------------------------------------------

// Convert strange NBSP/narrow spacing → real spaces
function cleanSpaces(str) {
    return str
        .replace(/[\u00A0\u202F\u2007\u2009\u200A\u2000-\u200F\u2028\u2029]/g," ") // fix unknown whitespace
        .replace(/\s+/g," ") // collapse double spaces
        .trim();
}

function formatAud(v) {
    if (isNaN(v)) return "$0.00";
    return "$" + Number(v).toFixed(2);
}

// Convert "8 Dec 2025" → "2025-12-08"
// Convert ANY "8 Dec 2025" style date → ISO yyyy-mm-dd
function parseLedgerDate(str){
    if(!str) return "";

    // Remove every non-standard whitespace
    str = str.replace(/[\u00A0\u202F\u2007\u2002\u2003\u2009\u200A]/g," ").replace(/\s+/g," ").trim();

    // "8 Dec 2025" → ["8","Dec","2025"]
    const parts = str.split(" ");
    if(parts.length !== 3) return "";

    const day = parts[0].padStart(2,"0");
    const month = parts[1].toLowerCase();
    const year = parts[2];

    const map = {
        jan:1,feb:2,mar:3,apr:4,may:5,jun:6,
        jul:7,aug:8,sep:9,oct:10,nov:11,dec:12
    };

    const mm = String(map[month]||0).padStart(2,"0");
    return `${year}-${mm}-${day}`;
}




function normaliseDate(str) {
    if (!str) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const [d,m,y]=str.split("/"); return `${y}-${m}-${d}`;
    }
    const d=new Date(str);
    return !isNaN(d)?d.toISOString().slice(0,10):"";
}

function displayDate(d) {
    if (!d) return "";
    const [y,m,day]=d.split("-");
    return `${day}/${m}/${y}`;
}

// --------------------------------------------------------
// Render (duplicate highlight + sorting)
// --------------------------------------------------------

function renderLedger() {
    const tbody=document.querySelector("#ledger tbody");
    tbody.innerHTML="";

    state.ledger=state.ledger.map(tx=>({...tx,date:normaliseDate(tx.date)}));
    state.ledger.sort((a,b)=>b.date.localeCompare(a.date));

    const seen=new Set(),dups=new Set();
    state.ledger.forEach(tx=>{
        const key=`${tx.date}|${tx.amount}`;
        if(seen.has(key)) dups.add(key); else seen.add(key);
    });

    state.ledger.forEach((tx,i)=>{
        const tr=document.createElement("tr");
        if(dups.has(`${tx.date}|${tx.amount}`)){ tr.style.color="red"; tr.style.fontWeight="bold"; }

        let options="";
        if(state.categories.length){
            const sorted=[...state.categories].sort((a,b)=>a.name.localeCompare(b.name));
            options=sorted.map(c=>`<option ${tx.category===c.name?"selected":""}>${c.name}</option>`).join("")+
                     `<option value="" ${!tx.category?"selected":""}>Unassigned</option>`;
        }else options=`<option>No categories yet</option>`;

        tr.innerHTML=`
            <td>${displayDate(tx.date)}</td>
            <td>${tx.description||""}</td>
            <td><select class="ledger-category" data-index="${i}">${options}</select></td>
            <td class="amount">${formatAud(tx.amount)}</td>
            <td><button class="delete-btn" data-index="${i}">✕</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll(".delete-btn").forEach(btn=>btn.onclick=e=>{
        state.ledger.splice(+e.target.dataset.index,1); State.save(state); renderLedger();
    });

    document.querySelectorAll(".ledger-category").forEach(sel=>sel.onchange=e=>{
        state.ledger[+e.target.dataset.index].category=e.target.value; State.save(state);
    });
}

// --------------------------------------------------------
// Manual Add
// --------------------------------------------------------

function setupManualAdd(){
    document.getElementById("addManualBtn").onclick=()=>{
        const date=normaliseDate(cleanSpaces(manualDate.value));
        const desc=cleanSpaces(manualDescription.value);
        const amount=Number(manualAmount.value);
        const category=manualCategory.value;
        if(!desc) return alert("Enter description.");

        state.ledger.push({date,description:desc,amount,category});
        State.save(state); renderLedger();

        manualDescription.value=""; manualAmount.value="";
    };
}

// --------------------------------------------------------
// Search
// --------------------------------------------------------

function setupSearch(){
    ledgerSearch.addEventListener("input",()=>{
        const q=ledgerSearch.value.toLowerCase();
        document.querySelectorAll("#ledger tbody tr").forEach(r=>{
            r.style.display=r.textContent.toLowerCase().includes(q)?"":"none";
        });
    });
}

// --------------------------------------------------------
// CSV IMPORT — FINAL FIXED VERSION
// --------------------------------------------------------

function setupImport(){
    importBtn.onclick=()=>{
        const file = csvFile.files[0];
        if(!file) return alert("Choose CSV first");

        lastImportBackup = JSON.parse(JSON.stringify(state.ledger));

        const reader = new FileReader();
        reader.onload = e => {
            try{
                let lines = e.target.result.split("\n").filter(l=>l.trim());

                if(lines[0].toLowerCase().includes("date")) lines.shift();

                lines.forEach(row=>{
                    // TRUE CSV PARSE — handles embedded commas, quotes, blanks
                    const cols = [];
                    let current = "";
                    let insideQuotes = false;

                    for(let i=0;i<row.length;i++){
                        const c=row[i];
                        if(c==='"') insideQuotes = !insideQuotes;
                        else if(c===',' && !insideQuotes){
                            cols.push(current.trim());
                            current="";
                        } else {
                            current+=c;
                        }
                    }
                    cols.push(current.trim());

                    const rawDate = cleanSpaces(cols[0]);
                    const desc    = cleanSpaces(cols[1]);
                    const amount  = Number((cols[2]||"0").replace(/,/g,"").replace(/[^\d.-]/g,""));
                    const iso = parseLedgerDate(rawDate);

                    state.ledger.push({
                        date: iso,
                        description: desc,
                        amount,
                        category: cols[3]??""
                    });
                });

                State.save(state);
                renderLedger();
                alert("Import complete — DATES FIXED ✓");

            } catch(err){
                console.error(err);
                state.ledger=[...lastImportBackup];
                State.save(state);renderLedger();
                alert("Import failed — restored old data ❗");
            }
        };

        reader.readAsText(file);
    };

    undoImportBtn.onclick=()=>{
        if(!lastImportBackup.length) return alert("No undo available");
        state.ledger = JSON.parse(JSON.stringify(lastImportBackup));
        State.save(state);renderLedger();
        alert("Undo complete ✓");
    };
}

// --------------------------------------------------------
// INIT
// --------------------------------------------------------

function initLedger(){loadCategoryDropdown();renderLedger();setupImport();setupManualAdd();setupSearch();}
document.addEventListener("DOMContentLoaded",initLedger);
