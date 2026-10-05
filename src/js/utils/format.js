export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      character
    ],
  );
}

import { getWorkspace } from "../core/store.js";

export function formatCurrency(value, currency = getWorkspace()?.preferences?.currency || "BRL") {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency,
  });
}

export function formatDate(value) {
  if (!value) return "—";
  const raw = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";
  const timezone = getWorkspace()?.preferences?.timezone || "America/Sao_Paulo";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: timezone }).format(date);
}

export function getTimeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function getInitials(value) {
  return String(value || "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
