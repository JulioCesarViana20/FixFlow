import { getWorkspace } from "../core/store.js";
import { formatCurrency } from "../utils/format.js";
import { pageHeader } from "../components/ui.js";
import { hasAdvancedDashboard } from "../core/plan-access.js";

export function reportsPage() {
  const workspace = getWorkspace();
  if (!hasAdvancedDashboard(workspace)) return `<section class="page">${pageHeader("Gestão", "Relatórios", "Uma leitura objetiva dos dados registrados no workspace.")}<div class="panel empty-state"><h2>Recurso disponível no Pro</h2><p>Faça upgrade para acessar relatórios, métricas e indicadores avançados.</p><button class="primary-button" data-action="view-plans">Conhecer planos</button></div></section>`;
  const orders = workspace.orders || [];
  const transactions = workspace.transactions || [];
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const status = (value) => orders.filter((order) => order.status === value).length;
  return `<section class="page">${pageHeader("Gestão", "Relatórios", "Uma leitura objetiva dos dados registrados no workspace.")}<div class="metric-grid"><div class="metric-card"><span>Receita total</span><h2>${formatCurrency(income)}</h2></div><div class="metric-card"><span>Despesas totais</span><h2>${formatCurrency(expense)}</h2></div><div class="metric-card"><span>Lucro líquido</span><h2>${formatCurrency(income - expense)}</h2></div><div class="metric-card"><span>Demandas concluídas</span><h2>${status("CONCLUÍDA") + status("PRONTO")}</h2></div></div><div class="dashboard-grid"><div class="panel"><h2 class="panel-title">Demandas por status</h2><div class="report-bars">${[["Pendente", "PENDENTE"], ["Em andamento", "EM ANDAMENTO"], ["Concluída", "CONCLUÍDA"], ["Cancelada", "CANCELADA"]].map(([label, value]) => `<div class="report-bar"><span>${label}</span><strong>${status(value)}</strong><div><i style="width:${orders.length ? Math.round(status(value) / orders.length * 100) : 0}%"></i></div></div>`).join("")}</div></div><div class="panel"><h2 class="panel-title">Clientes mais movimentados</h2>${topClients(workspace)}</div></div></section>`;
}

export function bindReports() {
  document.querySelector("[data-action=view-plans]")?.addEventListener("click", () => { window.location.hash = "#/app/billing"; });
}

function topClients(workspace) {
  const rows = (workspace.clients || []).map((client) => ({ client, total: (workspace.orders || []).filter((order) => order.clientId === client.id).reduce((sum, order) => sum + Number(order.total || 0), 0) })).filter((item) => item.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
  return rows.length ? rows.map((item) => `<div class="recent-row"><strong>${item.client.name}</strong><span>${formatCurrency(item.total)}</span></div>`).join("") : '<div class="empty-state compact"><p>Nenhum cliente possui movimentação ainda.</p></div>';
}
