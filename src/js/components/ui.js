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
