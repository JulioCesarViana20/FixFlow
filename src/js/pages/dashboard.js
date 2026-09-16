import { getWorkspace } from "../core/store.js";
import { formatCurrency } from "../utils/format.js";
import { emptyState, icon, pageHeader, primaryButton } from "../components/ui.js";

export function dashboardPage() {
  const workspace = getWorkspace();
  const orders = workspace.orders;
  const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const stats = [
    ["Demandas abertas", orders.length, "wrench"],
    ["Aguardando aprovação", countByStatus("AGUARDANDO APROVAÇÃO"), "clock-3"],
    ["Em andamento", countByStatus("EM MANUTENÇÃO"), "settings-2"],
    ["Prontas para concluir", countByStatus("PRONTO"), "package-check"],
    ["Total a receber", formatCurrency(total), "banknote"],
  ];

  return `<section class="page">${pageHeader(
    "Visão geral",
    `Bom dia, ${workspace.owner} 👋`,
    "Sua operação começa aqui.",
    primaryButton("Nova demanda", "new-order"),
  )}<div class="metric-grid">${stats.map(statCard).join("")}</div>${
    orders.length
      ? recentOrders(orders)
      : emptyState(
          "Sua operação começa aqui",
          "Crie seu primeiro fluxo para começar a acompanhar a operação.",
          "new-order",
          "Nova demanda",
        )
  }</section>`;

  function countByStatus(status) {
    return orders.filter((order) => order.status === status).length;
  }
}

function statCard([label, value, iconName]) {
  return `<div class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon(iconName)}</span></div><h2>${value}</h2><span class="metric-change">Dados deste workspace</span></div>`;
}

function recentOrders(orders) {
  return `<div class="dashboard-grid"><div class="panel"><h2 class="panel-title">Demandas em fluxo</h2><p class="panel-subtitle">Volume real do seu workspace</p><div class="empty-chart">${icon("chart-no-axes-combined")}<span>O gráfico será preenchido conforme seu histórico crescer.</span></div></div><div class="panel"><h2 class="panel-title">Atividades recentes</h2><div class="recent-list">${orders.slice(-5).reverse().map(orderRow).join("")}</div></div></div>`;
}

function orderRow(order) {
  return `<div class="recent-row"><div class="client-cell"><span class="mini-avatar">${order.clientName.slice(0, 2).toUpperCase()}</span><span><strong>${order.clientName}</strong><small>${order.number}</small></span></div><div class="equipment"><strong>${order.device}</strong><small>${order.problem}</small></div><div><span class="status blue">${order.status}</span><div class="price">${formatCurrency(order.total)}</div></div></div>`;
}
