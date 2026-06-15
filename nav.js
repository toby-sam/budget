/**
 * nav.js
 * Centrally manages the navigation menu to avoid copy-pasting across files.
 */

const navItems = [
    { name: "AU Ledger", link: "ledger.html" },
    { name: "AU Budget", link: "budget.html" },
    { name: "Income", link: "income.html" },
    { name: "Bonus Income", link: "bonus-income.html" },
    { name: "PH Ledger", link: "philippines.html" },
    { name: "PH Budget", link: "ph-budget.html" },
    { name: "Software Ledger", link: "sam-ledger.html" },
    { name: "Software Budget", link: "sam-budget.html" },
    { name: "Solect Ledger", link: "solect-ledger.html" },
    { name: "Solect Budget", link: "solect-budget.html" },
    { name: "Debts", link: "debts.html" },
    { name: "Investments", link: "investments.html" },
    { name: "Graphs", link: "budget-graphs.html" },
];

function renderNav() {
    const navContainer = document.querySelector(".nav-links");
    if (!navContainer) return;

    // Clear existing links (in case of hardcoded fallback)
    navContainer.innerHTML = "";

    // Get current page filename (e.g., 'budget.html')
    // Default to index.html or empty string if root
    const currentPath = window.location.pathname.split("/").pop();

    navItems.forEach((item) => {
        const a = document.createElement("a");
        a.href = item.link;
        a.textContent = item.name;

        // Simple active check: if link matches filename, OR if it's budget.html and we have no path
        if (
            item.link === currentPath ||
            (item.link === "budget.html" && !currentPath)
        ) {
            a.classList.add("active");
        }

        navContainer.appendChild(a);
    });
}

// Run on load
document.addEventListener("DOMContentLoaded", renderNav);
