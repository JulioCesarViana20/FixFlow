import { getWorkspace, markNotificationsRead } from "../core/store.js";
import { escapeHtml, formatCurrency, formatDate } from "../utils/format.js";
import { icon, pageHeader } from "../components/ui.js";

export function clientAreaPage() {
  const workspace = getWorkspace();
  const clients = workspace.clients || [];
  if (!clients.length) return `<section class="page">${pageHeader("Experiência", "Área do cliente", "Visualize o que um cliente receberia no portal.")}<div class="empty-state">${icon("users")}<h2>Nenhum cliente cadastrado.</h2><p>Cadastre um cliente para visualizar demandas e comunicações.</p></div></section>`;
  const client = clients[0];
  const orders = workspace.orders.filter((order) => order.clientId === client.id);
  const notifications = (workspace.notifications || []).filter((item) => item.clientId === client.id);
  markNotificationsRead(client.id);
  return `<section class="page">${pageHeader("Experiência", "Área do cliente", "Uma visão clara dos serviços e comunicações compartilhadas.")}<div class="panel client-profile"><p class="eyebrow">Cliente selecionado</p><h2>${escapeHtml(client.name || client.tradeName || client.legalName)}</h2><p>${escapeHtml(client.email || "Sem email cadastrado")} · ${escapeHtml(client.phone || "Sem telefone cadastrado")}</p></div><div class="dashboard-grid"><div class="panel"><h2 class="panel-title">Demandas</h2>${orders.length ? orders.map((order) => `<div class="recent-row"><span><strong>${escapeHtml(order.title)}</strong><small>Prazo: ${formatDate(order.dueDate)}</small></span><span><b class="status blue">${order.status}</b><small>${formatCurrency(order.total)}</small></span></div>`).join("") : '<p class="panel-subtitle">Nenhuma demanda vinculada.</p>'}</div><div class="panel"><h2 class="panel-title">Notificações</h2>${notifications.length ? notifications.map((item) => `<div class="recent-row"><span>${escapeHtml(item.message)}</span><small>${formatDate(item.createdAt)}</small></div>`).join("") : '<p class="panel-subtitle">Nenhuma comunicação disponível.</p>'}</div></div></section>`;
}
