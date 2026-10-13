import { addOrder, deleteOrder, deleteOrders, getWorkspace, updateOrder } from "../core/store.js";
import { escapeHtml, formatCurrency } from "../utils/format.js";
import { bindModal, hydrateIcons, icon, pageHeader, primaryButton, showPlanLimitError, showToast } from "../components/ui.js";
import { todayInputValue } from "../utils/validation.js";
import { formatDate } from "../utils/format.js";

const statuses = ["PENDENTE", "EM ANDAMENTO", "CONCLUÍDA", "CANCELADA"];

export function ordersPage() {
  const orders = getWorkspace().orders || [];
  return `<section class="page">${pageHeader("Operação", "Demandas", "Acompanhe cada processo, do início à conclusão.", primaryButton("Nova demanda", "new-order"))}<div class="table-panel panel"><div class="table-toolbar"><label class="search-field">${icon("search")}<input id="order-search" placeholder="Pesquisar demanda" type="search"></label><select id="order-status-filter"><option value="">Todos os status</option>${statuses.map((status) => `<option>${status}</option>`).join("")}</select><div id="order-selection-actions" class="selection-actions"><span data-selection-count>0 selecionadas</span><button class="danger-button" data-bulk-delete-orders>Excluir selecionadas</button></div></div><div id="orders-list">${ordersTable(orders)}</div></div><div id="order-modal-root"></div></section>`;
}

function ordersTable(orders) {
  if (!orders.length) return '<div class="empty-state"><i data-lucide="inbox"></i><h2>Você ainda não possui demandas cadastradas.</h2><p>Crie sua primeira demanda para acompanhar a operação.</p><button class="primary-button" data-action="new-order">+ Nova demanda</button></div>';
  return `<div class="responsive-table"><table class="data-table"><thead><tr><th><input type="checkbox" data-select-all-orders aria-label="Selecionar todas as demandas"></th><th>Demanda</th><th>Cliente</th><th>Prazo</th><th>Status</th><th>Valor</th><th>Ações</th></tr></thead><tbody>${orders.map((order) => `<tr><td><input type="checkbox" data-select-order="${order.id}" aria-label="Selecionar ${escapeHtml(order.title || order.number)}"></td><td><strong>${escapeHtml(order.title || order.device || order.number)}</strong><small>${escapeHtml(order.number)}</small></td><td>${escapeHtml(order.clientName || "Sem cliente")}</td><td>${order.dueDate ? formatDate(order.dueDate) : "Sem prazo"}</td><td><select data-status-order="${order.id}">${statuses.map((status) => `<option ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}</select></td><td>${formatCurrency(order.total)}</td><td><div class="table-actions"><button class="table-action-button" data-edit-order="${order.id}" aria-label="Editar demanda" title="Editar demanda">${icon("pencil")}<span>Editar</span></button><button class="table-action-button danger-action" data-delete-order="${order.id}" aria-label="Excluir demanda" title="Excluir demanda">${icon("trash-2")}<span>Excluir</span></button></div></td></tr>`).join("")}</tbody></table></div>`;
}

function orderForm(order = {}) {
  const workspace = getWorkspace();
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="order-modal-title"><div class="modal-heading"><div><p class="eyebrow">Operação</p><h2 id="order-modal-title">${order.id ? "Editar demanda" : "Nova demanda"}</h2></div><button class="icon-button" data-close-modal aria-label="Fechar">${icon("x")}</button></div><form id="order-form" class="form-grid" data-order-id="${order.id || ""}"><label>Título *<input name="title" required value="${escapeHtml(order.title || order.device)}"></label><label>Cliente<select name="clientId"><option value="">Sem cliente</option>${(workspace.clients || []).map((client) => `<option value="${client.id}" ${client.id === order.clientId ? "selected" : ""}>${escapeHtml(client.name || client.tradeName || client.legalName)}</option>`).join("")}</select></label><label>Valor<input name="value" type="number" min="0" step="0.01" value="${Number(order.total || 0)}"></label><label>Prazo<input name="dueDate" type="date" min="${todayInputValue()}" value="${order.dueDate || todayInputValue()}"></label><label>Status<select name="status">${statuses.map((status) => `<option ${status === (order.status || "PENDENTE") ? "selected" : ""}>${status}</option>`).join("")}</select></label><label>Prioridade<select name="priority">${["Baixa", "Média", "Alta"].map((item) => `<option ${item === (order.priority || "Média") ? "selected" : ""}>${item}</option>`).join("")}</select></label><label>Categoria<input name="category" value="${escapeHtml(order.category)}"></label>  <label>Responsável<input name="assignee" value="${escapeHtml(order.assignee)}"></label><label class="full-field">Descrição<textarea name="description">${escapeHtml(order.description || order.problem)}</textarea></label><label class="full-field">Observações<textarea name="notes">${escapeHtml(order.notes)}</textarea></label><p id="order-form-error" class="form-error full-field" hidden></p><div class="modal-actions full-field"><button type="button" class="secondary-button" data-close-modal>Cancelar</button><button class="primary-button" type="submit">Salvar demanda</button></div></form></section></div>`;
}

export function bindOrderCards() {
  const selected = new Set();
  const root = document.querySelector("#order-modal-root");
  const updateSelection = () => {
    const toolbar = document.querySelector("#order-selection-actions");
    toolbar.hidden = !selected.size;
    toolbar.querySelector("[data-selection-count]").textContent = `${selected.size} selecionada${selected.size === 1 ? "" : "s"}`;
  };
  const render = () => {
    document.querySelector("#orders-list").innerHTML = ordersTable(filteredOrders());
    hydrateIcons();
    document.querySelectorAll("[data-select-order]").forEach((input) => {
      input.checked = selected.has(input.dataset.selectOrder);
      input.addEventListener("change", () => { input.checked ? selected.add(input.dataset.selectOrder) : selected.delete(input.dataset.selectOrder); updateSelection(); });
    });
    document.querySelector("[data-select-all-orders]")?.addEventListener("change", (event) => {
      document.querySelectorAll("[data-select-order]").forEach((input) => { input.checked = event.target.checked; event.target.checked ? selected.add(input.dataset.selectOrder) : selected.delete(input.dataset.selectOrder); });
      updateSelection();
    });
    bindEvents();
  };
  const filteredOrders = () => {
    const query = (document.querySelector("#order-search")?.value || "").toLowerCase();
    const filter = document.querySelector("#order-status-filter")?.value || "";
    return (getWorkspace().orders || []).filter((order) => `${order.title} ${order.device} ${order.clientName} ${order.number}`.toLowerCase().includes(query) && (!filter || order.status === filter));
  };
  const open = (order = {}) => {
    root.innerHTML = orderForm(order);
    bindModal(root);
    root.querySelector("form").onsubmit = (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      values.clientName = getWorkspace().clients.find((client) => client.id === values.clientId)?.name || "";
      const id = event.currentTarget.dataset.orderId;
      try {
        if (id) updateOrder(id, values); else addOrder(values);
      } catch (error) {
        const feedback = root.querySelector("#order-form-error");
        if (error.message === "PLAN_LIMIT_REACHED") showPlanLimitError(feedback, error);
        else {
          feedback.hidden = false;
          feedback.textContent = error.message === "DUE_DATE_IN_PAST" ? "O prazo não pode ser anterior à data atual." : error.message === "DUPLICATE_ORDER" ? "Essa demanda já está registrada." : "Não foi possível salvar a demanda.";
        }
        return;
      }
      showToast(id ? "Demanda atualizada." : "Demanda criada.");
      window.location.hash = "#/app/orders";
    };
  };
  function bindEvents() {
    document.querySelectorAll("[data-action=new-order]").forEach((button) => { button.onclick = () => open(); });
    document.querySelectorAll("[data-edit-order]").forEach((button) => { button.onclick = () => open(getWorkspace().orders.find((order) => order.id === button.dataset.editOrder)); });
    document.querySelectorAll("[data-delete-order]").forEach((button) => { button.onclick = () => { if (window.confirm("Excluir esta demanda?")) { deleteOrder(button.dataset.deleteOrder); render(); } }; });
    document.querySelectorAll("[data-status-order]").forEach((select) => { select.onchange = () => { updateOrder(select.dataset.statusOrder, { status: select.value }); showToast("Status atualizado."); }; });
  }
  document.querySelector("#order-search")?.addEventListener("input", render);
  document.querySelector("#order-status-filter")?.addEventListener("change", render);
  document.querySelector("#order-selection-actions").hidden = true;
  document.querySelector("[data-bulk-delete-orders]").onclick = () => {
    if (!selected.size || !window.confirm(`Excluir ${selected.size} demanda${selected.size === 1 ? "" : "s"} selecionada${selected.size === 1 ? "" : "s"}?`)) return;
    const count = deleteOrders([...selected]);
    selected.clear();
    showToast(`${count} demanda${count === 1 ? "" : "s"} excluída${count === 1 ? "" : "s"}.`);
    window.location.hash = "#/app/orders";
  };
  render();
}
