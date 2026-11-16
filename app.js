const STORAGE_KEY = "pennywise-finance-v1";

const EXPENSE_CATEGORIES = ["Food & groceries", "Transportation", "Rent & housing", "Shopping", "Healthcare", "Education", "Entertainment", "Utilities", "Travel", "Other expenses"];
const INCOME_CATEGORIES = ["Salary", "Freelance", "Rental income", "Business income", "Other income"];
const CATEGORY_ICONS = {
  "Food & groceries": "🥑", "Transportation": "🚲", "Rent & housing": "⌂", "Shopping": "◈",
  "Healthcare": "♡", "Education": "▱", "Entertainment": "♫", "Utilities": "ϟ",
  "Travel": "✈", "Other expenses": "◌", "Salary": "↗", "Freelance": "✳",
  "Rental income": "⌂", "Business income": "▦", "Other income": "＋"
};
const DEFAULT_BUDGETS = {
  "Food & groceries": 12000, "Transportation": 5000, "Rent & housing": 18000,
  "Shopping": 7000, "Healthcare": 4000, "Education": 5000, "Entertainment": 3500,
  "Utilities": 4500, "Travel": 5000, "Other expenses": 3000
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

function createDemoData() {
  const date = (day) => `${currentMonth}-${String(Math.min(day, today.getDate())).padStart(2, "0")}`;
  return {
    transactions: [
      { id: "demo-1", description: "Monthly salary", category: "Salary", type: "income", amount: 85000, date: date(1) },
      { id: "demo-2", description: "Apartment rent", category: "Rent & housing", type: "expense", amount: 18000, date: date(2) },
      { id: "demo-3", description: "Weekly groceries", category: "Food & groceries", type: "expense", amount: 2350, date: date(5) },
      { id: "demo-4", description: "Metro card recharge", category: "Transportation", type: "expense", amount: 1200, date: date(8) },
      { id: "demo-5", description: "Freelance project", category: "Freelance", type: "income", amount: 12000, date: date(10) },
      { id: "demo-6", description: "Dinner with friends", category: "Food & groceries", type: "expense", amount: 1650, date: date(12) },
      { id: "demo-7", description: "Electricity bill", category: "Utilities", type: "expense", amount: 2100, date: date(14) },
      { id: "demo-8", description: "New running shoes", category: "Shopping", type: "expense", amount: 3200, date: date(16) },
      { id: "demo-9", description: "Pharmacy", category: "Healthcare", type: "expense", amount: 850, date: date(18) }
    ],
    budgets: { ...DEFAULT_BUDGETS },
    goals: [
      { id: "goal-emergency", name: "Emergency fund", target: 100000, saved: 42000, targetDate: `${today.getFullYear()}-12-31` },
      { id: "goal-trip", name: "Goa getaway", target: 35000, saved: 18500, targetDate: `${today.getFullYear()}-09-30` }
    ]
  };
}

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return createDemoData();
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed.transactions) || !parsed.budgets || !Array.isArray(parsed.goals)) throw new Error("Stored finance data has an invalid shape.");
    return parsed;
  } catch (error) {
    console.error("Could not load saved finance data.", error);
    return createDemoData();
  }
}

let data = loadData();
let activeView = "overview";
let toastTimer;

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Could not save finance data.", error);
    showToast("Your changes could not be saved in this browser.");
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function money(amount, compact = false) {
  const value = Number(amount) || 0;
  if (compact && Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(value >= 1000000 ? 1 : 0)}L`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value, options = { day: "numeric", month: "short" }) {
  if (!value) return "No date set";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", options);
}

function selectedMonth() {
  return $("#month-picker").value || currentMonth;
}

function monthTransactions(month = selectedMonth()) {
  return data.transactions.filter((transaction) => transaction.date.startsWith(month));
}

function sums(transactions = monthTransactions()) {
  return transactions.reduce((result, transaction) => {
    result[transaction.type] += Number(transaction.amount) || 0;
    return result;
  }, { income: 0, expense: 0 });
}

function expensesByCategory(transactions = monthTransactions()) {
  return transactions.filter((item) => item.type === "expense").reduce((totals, item) => {
    totals[item.category] = (totals[item.category] || 0) + Number(item.amount);
    return totals;
  }, {});
}

function budgetTotals() {
  const limit = Object.values(data.budgets).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const spent = Object.values(expensesByCategory()).reduce((sum, value) => sum + value, 0);
  return { limit, spent, percent: limit ? spent / limit * 100 : 0 };
}

function goalTotals() {
  return data.goals.reduce((sum, goal) => sum + (Number(goal.saved) || 0), 0);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function updateMonthLabels() {
  const month = selectedMonth();
  const date = new Date(`${month}-01T00:00:00`);
  const text = date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  $("#period-label").textContent = text;
  $("#welcome-date").textContent = `YOUR MONEY, AT A GLANCE · ${text.toUpperCase()}`;
}

function renderDashboard() {
  const transactions = monthTransactions();
  const totals = sums(transactions);
  const budget = budgetTotals();
  $("#balance-value").textContent = money(totals.income - totals.expense);
  $("#income-value").textContent = money(totals.income);
  $("#expense-value").textContent = money(totals.expense);
  $("#saved-value").textContent = money(goalTotals());
  $("#goals-count").textContent = `${data.goals.length} ${data.goals.length === 1 ? "goal" : "goals"}`;
  $("#budget-spent").textContent = money(budget.spent);
  $("#budget-limit").textContent = money(budget.limit);
  $("#budget-percent").textContent = `${Math.round(budget.percent)}%`;
  $("#budget-progress-bar").style.width = `${Math.min(budget.percent, 100)}%`;
  $("#budget-progress-bar").classList.toggle("over", budget.percent > 100);
  $("#budget-status").textContent = budget.percent > 100 ? "You’re over your monthly budget." : budget.percent >= 80 ? "You’re getting close to your monthly limit." : "You’re doing well. Keep it up!";

  const budgetEntries = Object.entries(data.budgets)
    .map(([category, limit]) => ({ category, limit: Number(limit), spent: expensesByCategory()[category] || 0 }))
    .filter((item) => item.limit > 0)
    .sort((a, b) => b.spent / (b.limit || 1) - a.spent / (a.limit || 1))
    .slice(0, 4);
  $("#dashboard-budget-list").innerHTML = budgetEntries.length ? budgetEntries.map((item) => `
    <div class="mini-budget">
      <span class="mini-category-icon">${CATEGORY_ICONS[item.category] || "◌"}</span>
      <span class="mini-budget-name">${escapeHtml(item.category)}</span>
      <span class="mini-budget-values">${money(item.spent)} / ${money(item.limit)}</span>
    </div>`).join("") : `<div class="empty-state">No budgets set for this month.</div>`;

  $("#recent-transactions").innerHTML = transactions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((transaction) => `
    <div class="transaction-row">
      <span class="transaction-icon">${CATEGORY_ICONS[transaction.category] || "◌"}</span>
      <div><div class="transaction-name">${escapeHtml(transaction.description)}</div><div class="transaction-detail">${escapeHtml(transaction.category)}</div></div>
      <span class="transaction-date">${formatDate(transaction.date)}</span>
      <span class="transaction-amount ${transaction.type === "income" ? "amount-income" : "amount-expense"}">${transaction.type === "income" ? "+" : "−"}${money(transaction.amount)}</span>
    </div>`).join("") || `<div class="empty-state"><strong>No transactions this month</strong><p>Add your first income or expense to get started.</p></div>`;

  $("#dashboard-goals").innerHTML = data.goals.slice(0, 3).map((goal) => {
    const percentage = Math.min(100, goal.target ? goal.saved / goal.target * 100 : 0);
    return `<div class="goal-preview"><div class="goal-preview-top"><span class="goal-preview-name">${escapeHtml(goal.name)}</span><span class="goal-preview-amount">${money(goal.saved)} / ${money(goal.target)}</span></div><div class="goal-progress"><span style="width:${percentage}%"></span></div><div class="goal-preview-bottom"><span>${Math.round(percentage)}% complete</span><span>${money(Math.max(0, goal.target - goal.saved))} to go</span></div></div>`;
  }).join("") || `<div class="empty-state"><strong>No savings goals yet</strong><p>Start saving for something that matters to you.</p></div>`;
  drawChart($("#overview-chart"), transactions);
}

function renderTransactions() {
  const search = $("#transaction-search").value.trim().toLowerCase();
  const category = $("#category-filter").value;
  const type = $("#type-filter").value;
  const filtered = data.transactions.filter((transaction) => {
    const matchesSearch = `${transaction.description} ${transaction.category}`.toLowerCase().includes(search);
    return matchesSearch && (!category || transaction.category === category) && (!type || transaction.type === type);
  }).sort((a, b) => b.date.localeCompare(a.date));
  $("#transaction-count").textContent = filtered.length;
  $("#transaction-rows").innerHTML = filtered.map((transaction) => `
    <tr>
      <td><div class="table-trans-title"><span class="transaction-icon">${CATEGORY_ICONS[transaction.category] || "◌"}</span><span class="table-description">${escapeHtml(transaction.description)}</span></div></td>
      <td>${escapeHtml(transaction.category)}</td>
      <td>${formatDate(transaction.date, { day: "numeric", month: "short", year: "numeric" })}</td>
      <td><span class="type-badge ${transaction.type}">${transaction.type === "income" ? "Income" : "Expense"}</span></td>
      <td class="table-amount ${transaction.type === "income" ? "amount-income" : "amount-expense"}">${transaction.type === "income" ? "+" : "−"}${money(transaction.amount)}</td>
      <td><div class="table-action"><button type="button" data-edit-transaction="${escapeHtml(transaction.id)}" aria-label="Edit ${escapeHtml(transaction.description)}">Edit</button><button type="button" data-delete-transaction="${escapeHtml(transaction.id)}" aria-label="Delete ${escapeHtml(transaction.description)}">Delete</button></div></td>
    </tr>`).join("");
  $("#transactions-empty").classList.toggle("hidden", filtered.length > 0);
}

function renderBudgets() {
  const spentByCategory = expensesByCategory();
  const totalLimit = Object.values(data.budgets).reduce((sum, amount) => sum + (Number(amount) || 0), 0);
  const totalSpent = Object.values(spentByCategory).reduce((sum, amount) => sum + amount, 0);
  $("#budgets-total").textContent = money(totalLimit);
  $("#budgets-spent").textContent = money(totalSpent);
  $("#budgets-remaining").textContent = `${money(Math.max(0, totalLimit - totalSpent))} remaining`;
  const entries = Object.entries(data.budgets).filter(([, limit]) => Number(limit) > 0);
  $("#budgets-list").innerHTML = entries.length ? entries.map(([category, limit]) => {
    const spent = spentByCategory[category] || 0;
    const percent = limit ? spent / limit * 100 : 0;
    const over = percent > 100;
    return `<div class="budget-detail-row">
      <div class="budget-detail-category"><span class="mini-category-icon">${CATEGORY_ICONS[category] || "◌"}</span><div><strong>${escapeHtml(category)}</strong><span>${Math.round(percent)}% used${over ? " · limit exceeded" : ""}</span></div></div>
      <div class="progress-track"><span class="${over ? "over" : ""}" style="width:${Math.min(percent, 100)}%"></span></div>
      <div class="budget-detail-spent">${money(spent)} <span>/ ${money(limit)}</span></div>
      <div class="budget-detail-remaining">${over ? `<span class="budget-alert">${money(spent - limit)} over</span>` : `${money(limit - spent)} left`}</div>
    </div>`;
  }).join("") : `<div class="empty-state"><strong>No category budgets yet</strong><p>Set spending limits to give your money a plan.</p></div>`;

  $("#budget-form-fields").innerHTML = EXPENSE_CATEGORIES.map((category) => `
    <label class="budget-input-row">${CATEGORY_ICONS[category]} ${escapeHtml(category)}
      <span class="budget-input-wrap"><span>₹</span><input type="number" min="0" step="100" data-budget-category="${escapeHtml(category)}" value="${Number(data.budgets[category]) || ""}" placeholder="No limit"></span>
    </label>`).join("");
}

function renderGoals() {
  $("#goals-total-saved").textContent = money(goalTotals());
  $("#goals-active-count").textContent = data.goals.length;
  $("#goals-grid").innerHTML = data.goals.map((goal) => {
    const percentage = Math.min(100, goal.target ? goal.saved / goal.target * 100 : 0);
    const completed = percentage >= 100;
    return `<article class="goal-card">
      <div class="goal-card-top"><span class="goal-icon">✳</span><details class="goal-card-menu"><summary aria-label="Goal actions">···</summary><div class="goal-menu-actions"><button type="button" data-delete-goal="${escapeHtml(goal.id)}">Delete goal</button></div></details></div>
      <h3>${escapeHtml(goal.name)}</h3><div class="goal-card-target-date">${goal.targetDate ? `Target date · ${formatDate(goal.targetDate, { day: "numeric", month: "short", year: "numeric" })}` : "No target date set"}</div>
      <div class="goal-card-total"><strong>${money(goal.saved)}</strong><span>of ${money(goal.target)}</span></div><div class="goal-progress"><span style="width:${percentage}%"></span></div>
      <div class="goal-card-footer"><span>${completed ? "Goal completed" : `${money(Math.max(0, goal.target - goal.saved))} left to save`}</span><strong>${Math.round(percentage)}%</strong></div>
      <button type="button" class="contribute-button" data-contribute="${escapeHtml(goal.id)}" ${completed ? "disabled" : ""}>${completed ? "✓ Goal reached" : "＋ Add contribution"}</button>
    </article>`;
  }).join("") || `<div class="goal-empty"><span>◎</span><strong>No savings goals yet</strong><p>Pick something you’re saving for and make a little progress every month.</p><button class="button button-primary" data-create-goal>＋ Create your first goal</button></div>`;
}

function renderReports() {
  const transactions = monthTransactions();
  const totals = sums(transactions);
  $("#report-income").textContent = money(totals.income);
  $("#report-expenses").textContent = money(totals.expense);
  $("#report-net").textContent = money(totals.income - totals.expense);
  drawChart($("#report-chart"), transactions, true);
  const categories = Object.entries(expensesByCategory(transactions)).sort((a, b) => b[1] - a[1]);
  const total = categories.reduce((sum, [, value]) => sum + value, 0);
  $("#category-report-list").innerHTML = categories.length ? categories.map(([category, amount]) => `
    <div class="category-report-row"><span class="mini-category-icon">${CATEGORY_ICONS[category] || "◌"}</span><span class="category-report-name">${escapeHtml(category)}</span><span class="category-report-amount">${money(amount)}<span class="category-report-share">${total ? Math.round(amount / total * 100) : 0}% of spending</span></span></div>`).join("") : `<div class="report-empty">No expenses recorded this month.</div>`;
}

function drawChart(canvas, transactions, daily = false) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);
  const width = rect.width;
  const height = rect.height;
  const left = 34, right = 8, top = 14, bottom = 25;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const monthDate = new Date(`${selectedMonth()}-01T00:00:00`);
  const days = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const pointCount = daily ? days : 6;
  const buckets = Array.from({ length: pointCount }, () => ({ income: 0, expense: 0 }));
  transactions.forEach((transaction) => {
    const date = new Date(`${transaction.date}T00:00:00`);
    const index = daily ? date.getDate() - 1 : Math.min(5, Math.floor((date.getDate() - 1) / Math.ceil(days / 6)));
    if (buckets[index]) buckets[index][transaction.type] += Number(transaction.amount) || 0;
  });
  const max = Math.max(1000, ...buckets.flatMap((item) => [item.income, item.expense]));
  const scaleMax = max * 1.18;
  context.clearRect(0, 0, width, height);
  context.font = "9px DM Sans, sans-serif";
  context.textBaseline = "middle";
  for (let line = 0; line <= 3; line++) {
    const y = top + (plotHeight / 3) * line;
    context.strokeStyle = "#eef1ed";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(width - right, y);
    context.stroke();
    context.fillStyle = "#a3aca5";
    context.textAlign = "right";
    context.fillText(line === 0 ? money(scaleMax, true) : line === 3 ? "₹0" : money(scaleMax * (1 - line / 3), true), left - 7, y);
  }
  const step = plotWidth / pointCount;
  const groupWidth = Math.min(daily ? 11 : 29, step * (daily ? .7 : .65));
  const barWidth = Math.max(2, (groupWidth - 3) / 2);
  buckets.forEach((bucket, index) => {
    const center = left + step * index + step / 2;
    [["income", "#55a073"], ["expense", "#edb183"]].forEach(([key, color], offset) => {
      const barHeight = (bucket[key] / scaleMax) * plotHeight;
      context.fillStyle = color;
      roundedBar(context, center - groupWidth / 2 + offset * (barWidth + 3), top + plotHeight - barHeight, barWidth, barHeight, 3);
    });
    const shouldLabel = !daily || pointCount <= 15 || index % 5 === 0;
    if (shouldLabel) {
      const label = daily ? String(index + 1) : ["1st wk", "2nd wk", "3rd wk", "4th wk", "5th wk", "End"][index];
      context.fillStyle = "#a3aca5";
      context.textAlign = "center";
      context.fillText(label, center, height - 11);
    }
  });
}

function roundedBar(context, x, y, width, height, radius) {
  if (height <= 0) return;
  const actualRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + actualRadius, y);
  context.arcTo(x + width, y, x + width, y + height, actualRadius);
  context.arcTo(x + width, y + height, x, y + height, actualRadius);
  context.arcTo(x, y + height, x, y, actualRadius);
  context.arcTo(x, y, x + width, y, actualRadius);
  context.fill();
}

function renderAll() {
  updateMonthLabels();
  renderDashboard();
  renderTransactions();
  renderBudgets();
  renderGoals();
  renderReports();
}

function populateCategoryOptions(type, selected = "") {
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  $("#transaction-category").innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
  if (selected && categories.includes(selected)) $("#transaction-category").value = selected;
}

function openTransactionDialog(transaction = null) {
  const form = $("#transaction-form");
  form.reset();
  $("#transaction-id").value = transaction ? transaction.id : "";
  $("#transaction-type").value = transaction ? transaction.type : "expense";
  $$(".type-option").forEach((button) => button.classList.toggle("selected", button.dataset.transactionType === $("#transaction-type").value));
  populateCategoryOptions($("#transaction-type").value, transaction ? transaction.category : "");
  $("#transaction-description").value = transaction ? transaction.description : "";
  $("#transaction-amount").value = transaction ? transaction.amount : "";
  $("#transaction-date").value = transaction ? transaction.date : today.toISOString().slice(0, 10);
  $("#transaction-dialog-title").textContent = transaction ? "Edit transaction" : "Add transaction";
  $("#transaction-dialog").showModal();
  $("#transaction-description").focus();
}

function showView(view) {
  if (!$("#" + view + "-view")) return;
  activeView = view;
  $$(".view-section").forEach((section) => section.classList.toggle("active", section.id === `${view}-view`));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  $("#breadcrumb-current").textContent = { overview: "Overview", transactions: "Transactions", budgets: "Budgets", goals: "Savings goals", reports: "Reports" }[view];
  if (view === "overview" || view === "reports") requestAnimationFrame(() => { renderDashboard(); renderReports(); });
}

function populateFilters() {
  const categories = Array.from(new Set(data.transactions.map((transaction) => transaction.category))).sort();
  const current = $("#category-filter").value;
  $("#category-filter").innerHTML = `<option value="">All categories</option>${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}`;
  if (categories.includes(current)) $("#category-filter").value = current;
}

$("#month-picker").value = currentMonth;
populateFilters();
renderAll();

$$(".nav-item").forEach((item) => item.addEventListener("click", () => showView(item.dataset.view)));
$$("[data-navigate]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.navigate)));
$("#month-picker").addEventListener("change", renderAll);
$("#add-transaction").addEventListener("click", () => openTransactionDialog());
$("#add-transaction-secondary").addEventListener("click", () => openTransactionDialog());
$("#transaction-search").addEventListener("input", renderTransactions);
$("#category-filter").addEventListener("change", renderTransactions);
$("#type-filter").addEventListener("change", renderTransactions);
$("#edit-budgets").addEventListener("click", () => $("#budget-dialog").showModal());
$("#add-goal").addEventListener("click", () => { $("#goal-form").reset(); $("#goal-dialog").showModal(); });

$$(".type-option").forEach((button) => button.addEventListener("click", () => {
  $("#transaction-type").value = button.dataset.transactionType;
  $$(".type-option").forEach((option) => option.classList.toggle("selected", option === button));
  populateCategoryOptions(button.dataset.transactionType);
}));

$("#transaction-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number($("#transaction-amount").value);
  const description = $("#transaction-description").value.trim();
  if (!Number.isFinite(amount) || amount <= 0 || !description) return;
  const id = $("#transaction-id").value;
  const transaction = {
    id: id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    description,
    category: $("#transaction-category").value,
    type: $("#transaction-type").value,
    amount,
    date: $("#transaction-date").value
  };
  if (id) data.transactions = data.transactions.map((item) => item.id === id ? transaction : item);
  else data.transactions.push(transaction);
  persist();
  populateFilters();
  renderAll();
  $("#transaction-dialog").close();
  showToast(id ? "Transaction updated." : "Transaction added.");
});

$("#transaction-rows").addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-transaction]");
  const deleteButton = event.target.closest("[data-delete-transaction]");
  if (editButton) {
    const transaction = data.transactions.find((item) => item.id === editButton.dataset.editTransaction);
    if (transaction) openTransactionDialog(transaction);
  }
  if (deleteButton) {
    const transaction = data.transactions.find((item) => item.id === deleteButton.dataset.deleteTransaction);
    if (transaction && window.confirm(`Delete "${transaction.description}"?`)) {
      data.transactions = data.transactions.filter((item) => item.id !== transaction.id);
      persist();
      populateFilters();
      renderAll();
      showToast("Transaction deleted.");
    }
  }
});

$("#budget-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const next = {};
  $$("[data-budget-category]").forEach((input) => {
    const value = Number(input.value);
    if (input.value.trim() && Number.isFinite(value) && value > 0) next[input.dataset.budgetCategory] = value;
  });
  data.budgets = next;
  persist();
  renderAll();
  $("#budget-dialog").close();
  showToast("Monthly budgets saved.");
});

$("#goal-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const target = Number($("#goal-target").value);
  const name = $("#goal-name").value.trim();
  if (!Number.isFinite(target) || target <= 0 || !name) return;
  data.goals.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name,
    target,
    saved: 0,
    targetDate: $("#goal-date").value
  });
  persist();
  renderAll();
  $("#goal-dialog").close();
  showToast("Savings goal created.");
});

$("#goals-grid").addEventListener("click", (event) => {
  const contributeButton = event.target.closest("[data-contribute]");
  const deleteButton = event.target.closest("[data-delete-goal]");
  if (contributeButton) {
    const goal = data.goals.find((item) => item.id === contributeButton.dataset.contribute);
    if (!goal) return;
    $("#contribution-goal-id").value = goal.id;
    $("#contribution-goal-name").textContent = `Saving towards ${goal.name} · ${money(Math.max(0, goal.target - goal.saved))} left to reach your goal.`;
    $("#contribution-amount").value = "";
    $("#contribution-amount").max = Math.max(0, goal.target - goal.saved);
    $("#contribution-dialog").showModal();
  }
  if (deleteButton) {
    const goal = data.goals.find((item) => item.id === deleteButton.dataset.deleteGoal);
    if (goal && window.confirm(`Delete the "${goal.name}" savings goal?`)) {
      data.goals = data.goals.filter((item) => item.id !== goal.id);
      persist();
      renderAll();
      showToast("Savings goal deleted.");
    }
  }
});

$("#goals-grid").addEventListener("click", (event) => {
  if (event.target.closest("[data-create-goal]")) {
    $("#goal-form").reset();
    $("#goal-dialog").showModal();
  }
});

$("#contribution-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const goal = data.goals.find((item) => item.id === $("#contribution-goal-id").value);
  const amount = Number($("#contribution-amount").value);
  if (!goal || !Number.isFinite(amount) || amount <= 0 || amount > goal.target - goal.saved) {
    showToast("Enter an amount up to the remaining goal balance.");
    return;
  }
  goal.saved += amount;
  persist();
  renderAll();
  $("#contribution-dialog").close();
  showToast("Contribution added to your goal.");
});

$$(".dialog-close, .dialog-cancel").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
$$("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
}));

let resizeFrame;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    if (activeView === "overview") renderDashboard();
    if (activeView === "reports") renderReports();
  });
});
