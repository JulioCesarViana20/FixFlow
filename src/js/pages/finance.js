import { addTransaction, deleteTransaction, deleteTransactions, getWorkspace, updateTransaction } from "../core/store.js";
import { escapeHtml, formatCurrency, formatDate } from "../utils/format.js";
import { bindModal, icon, pageHeader, primaryButton, showPlanLimitError, showToast } from "../components/ui.js";
import { navigate } from "../core/router.js";

export function financePage() {
  const transactions = filterTransactions(getWorkspace().transactions || []);
  const income = transactions.filter((item) => item.type === "income" && item.status !== "pending").reduce((sum, item) => sum + item.amount, 0);
  const expense = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const pending = transactions.filter((item) => item.type === "income" && item.status === "pending").reduce((sum, item) => sum + item.amount, 0);
  const average = transactions.length ? (income + expense) / transactions.length : 0;
  const saved = new URLSearchParams(sessionStorage.getItem("fixflow.finance.filter") || "");
  return `<section class="page">${pageHeader("Gestão", "Financeiro", "Acompanhe entradas, saídas e valores pendentes.", primaryButton("Novo lançamento", "new-transaction"))}<div class="table-toolbar finance-filter"><label>Período<select id="finance-period"><option value="all">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 3 meses</option><option value="180">Últimos 6 meses</option><option value="365">Último ano</option><option value="custom">Personalizado</option></select></label><label>Data inicial<input type="date" id="finance-start" value="${saved.get("start") || ""}"></label><label>Data final<input type="date" id="finance-end" value="${saved.get("end") || ""}"></label></div><div class="metric-grid finance-metrics"><div class="metric-card metric-positive"><span>Receita recebida</span><h2>${formatCurrency(income)}</h2></div><div class="metric-card metric-negative"><span>Despesas</span><h2>${formatCurrency(expense)}</h2></div><div class="metric-card ${income - expense >= 0 ? "metric-positive" : "metric-negative"}"><span>Lucro líquido</span><h2>${formatCurrency(income - expense)}</h2></div><div class="metric-card metric-info"><span>Pendente · ${formatCurrency(pending)}</span><h2>${transactions.length}</h2><small>transações · ticket ${formatCurrency(average)}</small></div></div><div class="table-panel panel"><div class="table-toolbar"><strong>Histórico financeiro</strong><div id="finance-selection-actions" class="selection-actions"><span data-selection-count>0 selecionados</span><button class="danger-button" data-bulk-delete>Excluir selecionados</button></div><label class="search-field">${icon("search")}<input id="finance-search" placeholder="Pesquisar lançamento" type="search"></label></div><div id="transactions-list">${transactionsTable(transactions)}</div></div><div id="transaction-modal-root"></div></section>`;
}

function filterTransactions(items) {
  const params = new URLSearchParams(sessionStorage.getItem("fixflow.finance.filter") || "");
  const period = params.get("period") || "all";
  const now = new Date();
  let start = params.get("start") ? new Date(`${params.get("start")}T00:00:00`) : null;
  const end = params.get("end") ? new Date(`${params.get("end")}T23:59:59`) : null;
  if (!start && period !== "all" && period !== "custom") { start = new Date(now); start.setDate(start.getDate() - Number(period) + 1); start.setHours(0, 0, 0, 0); }
  return items.filter((item) => { const date = new Date(`${item.date}T12:00:00`); return (!start || date >= start) && (!end || date <= end); });
}

function transactionsTable(items) {
  if (!items.length) return '<div class="empty-state"><i data-lucide="wallet"></i><h2>Nenhum lançamento registrado.</h2><p>Registre sua primeira receita ou despesa para alimentar os indicadores.</p></div>';
  return `<div class="responsive-table"><table class="data-table"><thead><tr><th><input type="checkbox" data-select-all aria-label="Selecionar todos"></th><th>Data</th><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Cliente</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>${items.slice().sort((a, b) => b.date.localeCompare(a.date)).map((item) => { const client = getWorkspace().clients.find((entry) => entry.id === item.clientId); return `<tr><td><input type="checkbox" data-select-transaction="${item.id}" aria-label="Selecionar ${escapeHtml(item.description)}"></td><td>${formatDate(item.date)}</td><td><strong>${escapeHtml(item.description)}</strong></td><td>${item.type === "income" ? "Receita" : "Despesa"}</td><td>${escapeHtml(item.category || "Sem categoria")}</td><td>${escapeHtml(client?.name || client?.tradeName || "-")}</td><td class="${item.type === "income" ? "amount-positive" : "amount-negative"}">${item.type === "income" ? "+" : "-"} ${formatCurrency(item.amount)}</td><td>${item.status === "pending" ? "Pendente" : "Pago"}</td><td><div class="table-actions"><button class="icon-button" data-edit-transaction="${item.id}" aria-label="Editar">${icon("pencil")}</button><button class="icon-button" data-delete-transaction="${item.id}" aria-label="Excluir">${icon("trash-2")}</button></div></td></tr>`; }).join("")}</tbody></table></div>`;
}

function transactionForm(transaction = {}) {
  const workspace = getWorkspace();
  const editing = Boolean(transaction.id);
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title"><div class="modal-heading"><div><p class="eyebrow">Financeiro</p><h2 id="transaction-modal-title">${editing ? "Editar lançamento" : "Novo lançamento"}</h2></div><button class="icon-button" data-close-modal aria-label="Fechar">${icon("x")}</button></div><form id="transaction-form" class="form-grid" data-transaction-id="${transaction.id || ""}"><label>Tipo *<select name="type"><option value="income" ${transaction.type !== "expense" ? "selected" : ""}>Receita</option><option value="expense" ${transaction.type === "expense" ? "selected" : ""}>Despesa</option></select></label><label>Valor *<input name="amount" type="number" min="0.01" step="0.01" required value="${Number(transaction.amount || "")}"></label><label>Descrição *<input name="description" required value="${escapeHtml(transaction.description || "")}"></label><label>Data *<input name="date" type="date" value="${transaction.date || new Date().toISOString().slice(0, 10)}" required></label><label>Status<select name="status"><option value="paid" ${transaction.status !== "pending" ? "selected" : ""}>Recebido/Pago</option><option value="pending" ${transaction.status === "pending" ? "selected" : ""}>Pendente</option></select></label><label>Categoria<input name="category" placeholder="Ex.: Serviços" value="${escapeHtml(transaction.category || "")}"></label><label>Cliente relacionado<select name="clientId"><option value="">Nenhum</option>${(workspace.clients || []).map((client) => `<option value="${client.id}" ${client.id === transaction.clientId ? "selected" : ""}>${escapeHtml(client.name || client.tradeName || client.legalName)}</option>`).join("")}</select></label><label>Demanda relacionada<select name="orderId"><option value="">Nenhuma</option>${(workspace.orders || []).map((order) => `<option value="${order.id}" ${order.id === transaction.orderId ? "selected" : ""}>${escapeHtml(order.title)}</option>`).join("")}</select></label><label class="full-field">Observação<textarea name="notes">${escapeHtml(transaction.notes || "")}</textarea></label><p id="transaction-form-error" class="form-error full-field" hidden></p><div class="modal-actions full-field"><button type="button" class="secondary-button" data-close-modal>Cancelar</button><button class="primary-button" type="submit">Salvar lançamento</button></div></form></section></div>`;
}

export function bindFinance() {
  document.querySelectorAll("#finance-period, #finance-start, #finance-end").forEach((control) => control.addEventListener("change", () => {
    const period = document.querySelector("#finance-period").value;
    const start = document.querySelector("#finance-start").value;
    const end = document.querySelector("#finance-end").value;
    const query = new URLSearchParams({ period, start, end }).toString();
    sessionStorage.setItem("fixflow.finance.filter", query);
    navigate("/app/finance", true);
  }));
  const root = document.querySelector("#transaction-modal-root");
  const openTransaction = (transaction = {}) => {
    root.innerHTML = transactionForm(transaction);
    bindModal(root);
    root.querySelector("form").onsubmit = (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const id = form.dataset.transactionId;
      try {
        if (id) updateTransaction(id, Object.fromEntries(new FormData(form)));
        else addTransaction(Object.fromEntries(new FormData(form)));
        showToast(id ? "Movimentação atualizada." : "Movimentação registrada com sucesso.");
        window.location.hash = "#/app/finance";
      } catch (error) {
        if (error.message === "PLAN_LIMIT_REACHED") showPlanLimitError(root.querySelector("#transaction-form-error"), error);
        else showToast(error.message === "DUPLICATE_TRANSACTION" ? "Uma movimentação com esses dados já está registrada." : error.message === "INVALID_TRANSACTION_AMOUNT" ? "Informe um valor maior que zero." : error.message === "INVALID_TRANSACTION_DATE" ? "Informe uma data válida." : "Não foi possível salvar a movimentação.");
      }
    };
  };
  document.querySelector("[data-action=new-transaction]")?.addEventListener("click", () => openTransaction());
  const updateSelection = () => {
    const selected = [...document.querySelectorAll("[data-select-transaction]:checked")].map((input) => input.dataset.selectTransaction);
    const toolbar = document.querySelector("#finance-selection-actions");
    toolbar.hidden = !selected.length;
    toolbar.querySelector("[data-selection-count]").textContent = `${selected.length} selecionado${selected.length === 1 ? "" : "s"}`;
    toolbar.querySelector("[data-bulk-delete]").onclick = () => {
      if (!window.confirm(`Tem certeza que deseja excluir ${selected.length} registro${selected.length === 1 ? "" : "s"}?\n\nEssa ação não poderá ser desfeita.`)) return;
      deleteTransactions(selected);
      showToast(`${selected.length} registro${selected.length === 1 ? "" : "s"} excluído${selected.length === 1 ? "" : "s"} com sucesso.`);
      window.location.hash = "#/app/finance";
    };
  };
  document.querySelector("#finance-selection-actions").hidden = true;
  document.querySelector("[data-select-all]")?.addEventListener("change", (event) => {
    document.querySelectorAll("[data-select-transaction]").forEach((input) => { input.checked = event.target.checked; });
    updateSelection();
  });
  document.querySelectorAll("[data-select-transaction]").forEach((input) => input.addEventListener("change", updateSelection));
  document.querySelector("#transactions-list").addEventListener("change", (event) => {
    if (event.target.matches("[data-select-all]")) {
      document.querySelectorAll("[data-select-transaction]").forEach((input) => { input.checked = event.target.checked; });
      updateSelection();
    }
    if (event.target.matches("[data-select-transaction]")) updateSelection();
  });
  document.querySelector("#transactions-list").addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-transaction]");
    if (editButton) {
      openTransaction(getWorkspace().transactions.find((item) => item.id === editButton.dataset.editTransaction));
      return;
    }
    const button = event.target.closest("[data-delete-transaction]");
    if (!button || !window.confirm("Tem certeza que deseja excluir este registro?\n\nEssa ação não poderá ser desfeita.")) return;
    deleteTransaction(button.dataset.deleteTransaction);
    showToast("Registro excluído com sucesso.");
    window.location.hash = "#/app/finance";
  });
  document.querySelector("#finance-search")?.addEventListener("input", (event) => {
    const query = event.target.value.toLowerCase();
    document.querySelector("#transactions-list").innerHTML = transactionsTable((getWorkspace().transactions || []).filter((item) => `${item.description} ${item.category}`.toLowerCase().includes(query)));
    document.querySelector("#finance-selection-actions").hidden = true;
  });
}
