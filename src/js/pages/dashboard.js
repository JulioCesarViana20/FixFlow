import { getWorkspace } from "../core/store.js";
import { escapeHtml, formatCurrency, formatDate, getInitials, getTimeGreeting } from "../utils/format.js";
import { emptyState, icon, pageHeader, primaryButton } from "../components/ui.js";
import { hasAdvancedDashboard, getCurrentPlan, getUsage, getLimit, limitText } from "../core/plan-access.js";

export function dashboardPage(period = "all") {
  const workspace = getWorkspace();
  const orders = filterByPeriod(workspace.orders || [], period, (item) => item.createdAt);
  const transactions = workspace.transactions || [];
  const filteredTransactions = filterByPeriod(transactions, period, (item) => item.date);
  const total = filteredTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = filteredTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const stats = [
    ["Demandas abertas", orders.filter((order) => !["CONCLUÍDA", "CANCELADA", "ENTREGUE"].includes(order.status)).length, "wrench", "neutral"],
    ["Em andamento", countByStatus("EM ANDAMENTO") + countByStatus("EM MANUTENÇÃO"), "settings-2", "info"],
    ["Demandas concluídas", countByStatus("CONCLUÍDA") + countByStatus("PRONTO") + countByStatus("ENTREGUE"), "circle-check", "neutral"],
    ["Clientes cadastrados", (workspace.clients || []).length, "users", "neutral"],
    ["Lucro líquido", formatCurrency(total - expenses), "banknote", total - expenses >= 0 ? "positive" : "negative"],
  ];

  const plan = getCurrentPlan(workspace);
  const advanced = hasAdvancedDashboard(workspace);
  const advancedPanel = advanced ? `<div class="dashboard-plan-section"><div class="panel plan-dashboard"><div><p class="eyebrow">${plan.name}</p><h2>${plan.code === "business" ? "Visão empresarial" : "Indicadores avançados"}</h2><p>${plan.code === "business" ? "Acompanhe capacidade, produtividade e operação da sua empresa em um só lugar." : "Uma leitura mais completa da capacidade e desempenho do workspace."}</p></div><div class="plan-dashboard-metrics"><span><strong>${getUsage(workspace, "orders")}</strong>/${limitText(getLimit(workspace, "orders"))} demandas</span><span><strong>${getUsage(workspace, "clients")}</strong>/${limitText(getLimit(workspace, "clients"))} clientes</span><span><strong>${getUsage(workspace, "transactions")}</strong>/${limitText(getLimit(workspace, "transactions"))} lançamentos</span></div></div>${advancedDashboard(plan, workspace, orders, total, expenses)}</div>` : `<div class="panel plan-dashboard"><div><p class="eyebrow">Plano Free</p><h2>Comece pelos indicadores essenciais</h2><p>Faça upgrade para Pro e desbloqueie métricas avançadas, relatórios e mais capacidade.</p></div><button class="secondary-button" data-action="view-plans">Conhecer planos</button></div>`;
  return `<section class="page dashboard-page plan-${plan.code}">${pageHeader(
    "Visão geral",
    `${getTimeGreeting()}, ${workspace.owner} 👋`,
    "Sua operação começa aqui.",
    `${primaryButton("Nova demanda", "new-order")}<select id="dashboard-period" class="dashboard-period-select" aria-label="Período dos indicadores"><option value="all" ${period === "all" ? "selected" : ""}>Todo o período</option><option value="today" ${period === "today" ? "selected" : ""}>Hoje</option><option value="7" ${period === "7" ? "selected" : ""}>Últimos 7 dias</option><option value="30" ${period === "30" ? "selected" : ""}>Últimos 30 dias</option><option value="month" ${period === "month" ? "selected" : ""}>Este mês</option></select>`,
  )}<div class="metric-grid">${stats.map(statCard).join("")}</div>${advancedPanel}${
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

export function bindDashboard() {
  document.querySelector("#dashboard-period")?.addEventListener("change", (event) => {
    document.querySelector("#app").innerHTML = dashboardPage(event.target.value);
    bindDashboard();
  });
  document.querySelectorAll("[data-action=new-order]").forEach((button) => { button.onclick = () => { window.location.hash = "#/app/orders"; }; });
  document.querySelector("[data-action=view-plans]")?.addEventListener("click", () => { window.location.hash = "#/app/billing"; });
}

function filterByPeriod(items, period, getDate) {
  if (period === "all") return items;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "today") return items.filter((item) => new Date(getDate(item)).toDateString() === now.toDateString());
  if (period === "month") {
    start.setDate(1);
  } else {
    start.setDate(start.getDate() - Number(period) + 1);
  }
  return items.filter((item) => new Date(getDate(item)) >= start);
}

function statCard([label, value, iconName, tone]) {
  return `<div class="metric-card metric-${tone}"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon(iconName)}</span></div><h2>${value}</h2><span class="metric-change">Dados deste workspace</span></div>`;
}

function recentOrders(orders) {
  return `<div class="dashboard-grid"><div class="panel"><h2 class="panel-title">Demandas em fluxo</h2><p class="panel-subtitle">Registros reais do seu workspace</p><div class="recent-list">${orders.slice(-5).reverse().map(orderRow).join("")}</div></div><div class="panel"><h2 class="panel-title">Atividades recentes</h2><div class="recent-list">${(getWorkspace().activities || []).slice(0, 5).map((activity) => `<div class="recent-row"><span>${activity.text}</span><small>${formatDate(activity.date)}</small></div>`).join("") || '<p class="panel-subtitle">Nenhuma atividade registrada.</p>'}</div></div>`;
}

function advancedDashboard(plan, workspace, orders, income, expenses) {
  const completed = orders.filter((order) => ["CONCLUÍDA", "PRONTO", "ENTREGUE"].includes(order.status)).length;
  const completion = orders.length ? Math.round(completed / orders.length * 100) : 0;
  const team = Number(workspace.teamMembersCount || 1);
  const teamLimit = getLimit(workspace, "teamMembers");
  const teamPanel = plan.code === "business" ? `<div class="panel dashboard-insight"><p class="eyebrow">Equipe e gestão</p><h3>${team} membro${team === 1 ? "" : "s"} ativo${team === 1 ? "" : "s"}</h3><p>Capacidade: ${limitText(teamLimit)} membros · produtividade consolidada da empresa.</p><div class="progress-track"><i style="width:${teamLimit === -1 ? 18 : Math.min(100, team / teamLimit * 100)}%"></i></div></div>` : "";
  const statusRows = [["Em andamento", orders.filter((order) => ["EM ANDAMENTO", "EM MANUTENÇÃO"].includes(order.status)), "info"], ["Concluídas", orders.filter((order) => ["CONCLUÍDA", "PRONTO", "ENTREGUE"].includes(order.status)), "positive"], ["Pendentes", orders.filter((order) => order.status === "PENDENTE"), "neutral"]]
    .map(([label, items, tone]) => `<div class="status-bar-row"><span>${label}</span><strong>${items.length}</strong><div class="progress-track"><i class="bar-${tone}" style="width:${orders.length ? Math.round(items.length / orders.length * 100) : 0}%"></i></div></div>`).join("");
  const businessFinance = plan.code === "business" ? `<div class="panel dashboard-strategic-card"><p class="eyebrow">Faturamento</p><strong>${formatCurrency(income)}</strong><span>Receita registrada</span></div><div class="panel dashboard-strategic-card expense"><p class="eyebrow">Despesas</p><strong>${formatCurrency(expenses)}</strong><span>Custos registrados</span></div><div class="panel dashboard-strategic-card profit"><p class="eyebrow">Lucro</p><strong>${formatCurrency(income - expenses)}</strong><span>Resultado líquido</span></div>` : "";
  return `${businessFinance ? `<div class="dashboard-strategic-grid">${businessFinance}</div>` : ""}<div class="dashboard-insight-grid"><div class="panel dashboard-insight"><p class="eyebrow">Produtividade</p><h3>${completion}% de conclusão</h3><p>${completed} de ${orders.length} demandas concluídas no período.</p><div class="progress-track"><i class="bar-positive" style="width:${completion}%"></i></div></div><div class="panel dashboard-insight status-insight"><p class="eyebrow">Fluxo de demandas</p><div class="status-bars">${statusRows}</div></div>${teamPanel || `<div class="panel dashboard-insight"><p class="eyebrow">Resumo financeiro</p><h3 class="${income - expenses >= 0 ? "value-positive" : "value-negative"}">${formatCurrency(income - expenses)}</h3><p>Resultado líquido · receitas ${formatCurrency(income)} · despesas ${formatCurrency(expenses)}.</p></div>`}</div>`;
}

function orderRow(order) {
  const title = order.title || order.device || "Demanda sem título";
  const description = order.description || order.problem || "Sem descrição";
  const client = order.clientName || "Sem cliente";
  return `<div class="recent-row"><div class="client-cell"><span class="mini-avatar">${getInitials(client)}</span><span><strong>${escapeHtml(client)}</strong><small>${escapeHtml(order.number || "Sem número")}</small></span></div><div class="equipment"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></div><div><span class="status blue">${escapeHtml(order.status || "PENDENTE")}</span><div class="price">${formatCurrency(order.total)}</div></div></div>`;
}
