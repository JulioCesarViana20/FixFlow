import { emptyState, pageHeader } from "../components/ui.js";

export function placeholderPage(title, subtitle) {
  return `<section class="page">${pageHeader("Workspace", title, subtitle)}${emptyState(`Nenhum dado em ${title.toLowerCase()}.`, "Este módulo está pronto para receber os dados do seu workspace.")}</section>`;
}

export function comingSoonPage(title, subtitle) {
  return `<section class="page">${pageHeader("Em breve", title, subtitle)}${emptyState("Estamos preparando essa novidade", "A Flow IA está em desenvolvimento e será liberada gradualmente nas próximas atualizações do FixFlow.")}</section>`;
}
