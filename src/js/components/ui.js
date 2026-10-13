export const icon = (name) => `<i data-lucide="${name}"></i>`;

export function hydrateIcons() {
  if (window.lucide) window.lucide.createIcons();
}

export function showToast(message) {
  const node = document.querySelector("#toast");
  node.querySelector("span").textContent = message;
  node.classList.add("show");
  window.setTimeout(() => node.classList.remove("show"), 2200);
}

export function pageHeader(eyebrow, title, subtitle, action = "") {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${subtitle}</p></div>${action ? `<div class="heading-actions">${action}</div>` : ""}</div>`;
}

export function emptyState(title, text, action = "", label = "") {
  return `<div class="empty-state">${icon("inbox")}<h2>${title}</h2><p>${text}</p>${action ? `<button class="primary-button" data-action="${action}">${icon("plus")}${label}</button>` : ""}</div>`;
}

export function primaryButton(label, action) {
  return `<button class="primary-button" data-action="${action}">${icon("plus")}${label}</button>`;
}

export function bindModal(root, { closeSelector = "[data-close-modal], [data-close-subscription-modal]" } = {}) {
  if (!root) return () => {};
  const close = () => {
    document.removeEventListener("keydown", onKeydown);
    root.innerHTML = "";
  };
  const onKeydown = (event) => {
    if (event.key === "Escape") close();
  };
  root.querySelectorAll(closeSelector).forEach((button) => { button.onclick = close; });
  const backdrop = root.querySelector(".modal-backdrop");
  backdrop?.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener("keydown", onKeydown);
  root.querySelector("input, select, textarea, button:not(.icon-button)")?.focus();
  return close;
}

export function showPlanLimitError(node, error) {
  node.hidden = false;
  node.textContent = "";
  const message = document.createElement("span");
  message.textContent = `O limite do plano foi atingido (${error.usage}/${error.limit}). Conheça os planos superiores para continuar.`;
  const link = document.createElement("button");
  link.type = "button";
  link.className = "text-button";
  link.textContent = "Conhecer planos";
  link.onclick = () => { window.location.hash = "#/app/billing"; };
  node.append(message, " ", link);
}
