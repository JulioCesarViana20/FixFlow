import { getCurrentUser, getWorkspace, markNotificationRead, markAllNotificationsRead, signOut } from "../core/store.js";
import { navigate } from "../core/router.js";
import { icon, hydrateIcons, showToast } from "./ui.js";
import { escapeHtml } from "../utils/format.js";
import { formatDate } from "../utils/format.js";
import { getCurrentPlan } from "../core/plan-access.js";

const navigation = [
  { page: "dashboard", label: "Visão geral", icon: "layout-dashboard", section: "Workspace" },
  { page: "orders", label: "Demandas", icon: "wrench", section: "Workspace", count: "orders" },
  { page: "clients", label: "Clientes", icon: "users", section: "Workspace" },
  { page: "billing", label: "Cobranças", icon: "wallet-cards", section: "Workspace", count: "billing", alert: true },
  { page: "history", label: "Histórico", icon: "history", section: "Gestão" },
  { page: "finance", label: "Financeiro", icon: "hand-coins", section: "Gestão" },
  { page: "reports", label: "Relatórios", icon: "file-bar-chart", section: "Gestão" },
  { page: "settings", label: "Configurações", icon: "settings-2", section: "Gestão" },
  { page: "ai", label: "Flow IA", icon: "sparkles", section: "Experiência" },
  { page: "client", label: "Área do cliente", icon: "external-link", section: "Experiência" },
];

export function mountShell(path) {
  const workspace = getWorkspace();
  const user = getCurrentUser();
  document.body.classList.remove("public-mode");
  document.querySelector(".sidebar").style.display = "flex";
  document.querySelector(".topbar").style.display = "flex";
  document.querySelector(".sidebar").innerHTML = renderSidebar(workspace, user, path);
  document.querySelector(".topbar").innerHTML = renderTopbar(workspace, path, user);

  if (!document.querySelector(".sidebar-backdrop")) {
    const backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";
    backdrop.onclick = () => document.querySelector("#sidebar").classList.remove("open");
    document.body.appendChild(backdrop);
  }

  bindShellEvents();
}

function bindShellEvents() {
  document.querySelectorAll(".nav-item[data-page]").forEach((item) => {
    if (item.tagName === "A") return;
    item.onclick = () => navigate(`/app/${item.dataset.page}`);
  });
  document.querySelector("#menuToggle").onclick = () => {
    document.querySelector("#sidebar").classList.toggle("open");
  };
  document.querySelector("[data-sidebar-close]")?.addEventListener("click", () => {
    document.querySelector("#sidebar").classList.remove("open");
  });
  document.querySelector("[data-notifications]")?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleNotifications();
  });
  document.querySelector("[data-profile-settings]")?.addEventListener("click", () => navigate("/app/settings"));
  if (!document.body.dataset.shellPopoverBinding) {
    document.addEventListener("click", closeShellPopovers);
    document.body.dataset.shellPopoverBinding = "true";
  }
  document.querySelector("[data-logout]").onclick = () => {
    signOut();
    navigate("/");
    showToast("Sessão encerrada.");
  };
  document.querySelector(".upgrade-card .text-button")?.addEventListener("click", () => navigate("/app/billing"));
  hydrateIcons();
}

function closeShellPopovers(event) {
  if (!event.target.closest(".notification-center")) {
    document.querySelector(".notification-center")?.classList.remove("open");
  }
}

function toggleNotifications() {
  const panel = document.querySelector(".notification-center");
  panel.classList.toggle("open");
  if (panel.classList.contains("open")) {
    panel.querySelectorAll("[data-notification-id]").forEach((item) => {
      item.onclick = () => {
        markNotificationRead(item.dataset.notificationId);
        const notification = getWorkspace().notifications.find((entry) => entry.id === item.dataset.notificationId);
        if (notification?.orderId) navigate("/app/orders");
        else if (notification?.route) navigate(notification.route);
        else mountShell(location.hash.slice(2).replace("app/", "") || "dashboard");
      };
    });
    panel.querySelector("[data-mark-all-read]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      markAllNotificationsRead();
      mountShell(location.hash.slice(2).replace("app/", "") || "dashboard");
    });
  }
}

function labelFor(path) {
  return navigation.find((item) => item.page === path)?.label || "Visão geral";
}

function renderSidebar(workspace, user, path) {
  let lastSection = "";
  const links = navigation.map((item) => {
    const section = item.section !== lastSection ? `<small class="nav-label ${lastSection ? "nav-label-space" : ""}">${item.section}</small>` : "";
    lastSection = item.section;
    const count = item.count ? `<b class="${item.alert ? "alert-count" : ""}" data-count="${item.count}">${item.count === "orders" ? workspace.orders.length : 0}</b>` : "";
    return `${section}<button class="nav-item ${item.page === path ? "active" : ""}" data-page="${item.page}">${icon(item.icon)}<span>${item.label}</span>${count}</button>`;
  }).join("");
  const plan = getCurrentPlan(workspace);
  return `<div class="sidebar-brand"><div class="brand"><span class="brand-mark"><img src="fixflow.jpg" alt="FixFlow"></span><span>FixFlow</span></div><button class="sidebar-close" data-sidebar-close aria-label="Fechar menu">${icon("x")}</button></div><div class="workspace-switcher"><span class="workspace-icon">${initials(workspace.company)}</span><span><strong>${escapeHtml(workspace.company || "Sua empresa")}</strong><small>${escapeHtml(workspace.type || "Workspace atual")} · ${plan.name}</small></span></div><nav class="main-nav" aria-label="Navegação principal">${links}<a class="nav-item" href="index.html" data-page="landing">${icon("sparkles")}<span>Site do FixFlow</span></a></nav><div class="sidebar-bottom"><div class="upgrade-card"><span class="upgrade-icon">${icon("sparkles")}</span><strong>Plano ${plan.name}</strong><p>${plan.code === "business" ? "Gestão para equipes e escala." : "Evolua sua operação com mais recursos."}</p><button class="text-button">Conheça os planos ${icon("arrow-up-right")}</button></div><div class="profile-row"><button class="profile-row-button" data-profile-settings><span class="avatar avatar-julio">${initials(user?.name)}</span><span><strong>${escapeHtml(user?.name || "Administrador")}</strong><small>Workspace atual</small></span></button><button class="icon-button" data-logout aria-label="Sair">${icon("log-out")}</button></div></div>`;
}

function renderTopbar(workspace, path, user) {
  const notifications = workspace.notifications || [];
  const unread = notifications.filter((item) => !item.read).length;
  return `<button class="mobile-menu" id="menuToggle" aria-label="Abrir menu">${icon("menu")}</button><div class="breadcrumbs"><span>${escapeHtml(workspace.company || "FixFlow")}</span>${icon("chevron-right")}<strong id="breadcrumbTitle">${labelFor(path)}</strong></div><div class="top-actions"><div class="notification-center"><button class="icon-button notification" data-notifications aria-label="Notificações">${icon("bell")}${unread ? `<em>${unread}</em>` : ""}</button><div class="notification-panel"><div class="notification-panel-heading"><strong>Notificações</strong><button class="text-button" data-mark-all-read>Marcar todas como lidas</button></div>${notifications.length ? notifications.slice(0, 10).map((item) => `<button class="notification-item ${item.read ? "" : "unread"}" data-notification-id="${item.id}"><span>${icon(item.type === "welcome" ? "hand-wave" : item.type === "setup" ? "settings-2" : "bell-ring")}</span><span><strong>${item.type === "welcome" ? "Bem-vindo ao FixFlow" : item.type === "setup" ? "Complete as informações do workspace" : "Atualização do workspace"}</strong><small>${escapeHtml(item.message)}</small><time>${formatDate(item.createdAt)}</time></span></button>`).join("") : '<p class="notification-empty">Nenhuma notificação.</p>'}</div></div><button class="top-avatar" data-profile-settings aria-label="Abrir configurações">${initials(user?.name)}</button></div>`;
}

function initials(value) {
  return String(value || "WS")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
