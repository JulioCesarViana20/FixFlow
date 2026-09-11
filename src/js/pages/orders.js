import { getWorkspace } from "../core/store.js";
import { navigate } from "../core/router.js";
import { emptyState, pageHeader, primaryButton } from "../components/ui.js";

const statuses = [
  "NOVO",
  "EM DIAGNÓSTICO",
  "AGUARDANDO APROVAÇÃO",
  "EM MANUTENÇÃO",
  "PRONTO",
  "ENTREGUE",
  "CANCELADO",
];

export function ordersPage() {
  const workspace = getWorkspace();
  if (!workspace.orders.length) {
    return `<section class="page">${pageHeader("Operação", "Ordens de serviço", "Acompanhe cada reparo, do recebimento à entrega.", primaryButton("Nova ordem", "new-order"))}${emptyState("Você ainda não possui nenhuma ordem de serviço.", "Crie sua primeira ordem para organizar o atendimento do cliente.", "new-order", "Nova ordem")}</section>`;
  }

  return `<section class="page">${pageHeader("Operação", "Ordens de serviço", "Acompanhe cada reparo, do recebimento à entrega.", primaryButton("Nova ordem", "new-order"))}<div class="kanban-grid">${statuses.map((status) => column(status, workspace.orders.filter((order) => order.status === status))).join("")}</div></section>`;
}

function column(status, orders) {
  return `<div class="kanban-column"><div class="kanban-heading">${status}<span>${orders.length}</span></div><div class="kanban-stack">${orders.map(orderCard).join("") || '<p class="panel-subtitle">Nenhuma ordem</p>'}</div></div>`;
}

function orderCard(order) {
  return `<article class="kanban-card" data-order-id="${order.id}"><span class="order-id">${order.number}</span><h3>${order.clientName}</h3><p>${order.device}</p><p>${order.problem}</p><div class="card-meta"><span class="priority">${order.priority}</span><span class="time">R$ ${Number(order.total || 0).toFixed(2)}</span></div></article>`;
}

export function bindOrderCards() {
  document.querySelectorAll("[data-order-id]").forEach((card) => {
    card.onclick = () => navigate(`/app/orders/${card.dataset.orderId}`);
  });
}
