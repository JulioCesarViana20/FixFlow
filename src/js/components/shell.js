import { getCurrentUser, getWorkspace, signOut } from "../core/store.js";
import { navigate } from "../core/router.js";
import { icon, hydrateIcons, showToast } from "./ui.js";
import { escapeHtml } from "../utils/format.js";

const navigation = [
  { page: "dashboard", label: "Visão geral", icon: "layout-dashboard", section: "Workspace" },
  { page: "orders", label: "Demandas", icon: "wrench", section: "Workspace", count: "orders" },
  { page: "clients", label: "Clientes", icon: "users", section: "Workspace" },
  { page: "billing", label: "Cobranças", icon: "wallet-cards", section: "Workspace", count: "billing", alert: true },
  { page: "history", label: "Histórico", icon: "history", section: "Gestão" },
  { page: "settings", label: "Configurações", icon: "settings-2", section: "Gestão" },
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
  bindShellEvents();
}

function bindShellEvents() {
  document.querySelectorAll(".nav-item[data-page]").forEach((item) => {
    if (item.tagName === "A") return;
    item.onclick = () => navigate(`/app/${item.dataset.page}`);
  });
  document.querySelector("#menuToggle").onclick = () =>
    document.querySelector("#sidebar").classList.toggle("open");
  document.querySelector("[data-logout]").onclick = () => {
    signOut();
    navigate("/");
    showToast("Sessão encerrada.");
  };
  document.querySelector(".upgrade-card .text-button")?.addEventListener("click", () => navigate("/checkout/pro"));
  hydrateIcons();
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
  return `<div class="brand"><span class="brand-mark"><img src="fixflow.jpg" alt="FixFlow"></span><span>FixFlow</span></div><div class="workspace-switcher"><span class="workspace-icon">${initials(workspace.company)}</span><span><strong>${escapeHtml(workspace.company || "Sua empresa")}</strong><small>${escapeHtml(workspace.type || "Workspace atual")}</small></span>${icon("chevrons-up-down")}</div><nav class="main-nav" aria-label="Navegação principal">${links}<a class="nav-item" href="index.html" data-page="landing">${icon("sparkles")}<span>Site do FixFlow</span></a></nav><div class="sidebar-bottom"><div class="upgrade-card"><span class="upgrade-icon">${icon("sparkles")}</span><strong>Seu negócio, em fluxo.</strong><p>Você está no controle de tudo.</p><button class="text-button">Conheça o plano Pro ${icon("arrow-up-right")}</button></div><div class="profile-row"><span class="avatar avatar-julio">${initials(user?.name)}</span><span><strong>${escapeHtml(user?.name || "Administrador")}</strong><small>Workspace atual</small></span><button class="icon-button" data-logout aria-label="Sair">${icon("log-out")}</button></div></div>`;
}

function renderTopbar(workspace, path, user) {
  return `<button class="mobile-menu" id="menuToggle" aria-label="Abrir menu">${icon("menu")}</button><div class="breadcrumbs"><span>${escapeHtml(workspace.company || "FixFlow")}</span>${icon("chevron-right")}<strong id="breadcrumbTitle">${labelFor(path)}</strong></div><div class="top-actions"><button class="icon-button" aria-label="Pesquisar">${icon("search")}</button><button class="icon-button notification" aria-label="Notificações">${icon("bell")}<em></em></button><button class="top-avatar">${initials(user?.name)}</button></div>`;
}

function initials(value) {
  return String(value || "WS")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
