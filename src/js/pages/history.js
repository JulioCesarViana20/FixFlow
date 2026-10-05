import { clearActivities, getWorkspace } from "../core/store.js";
import { navigate } from "../core/router.js";
import { escapeHtml, formatDate } from "../utils/format.js";
import { emptyState, icon, pageHeader, showToast } from "../components/ui.js";

export function historyPage() {
  const activities = getWorkspace()?.activities || [];
  const content = activities.length
    ? `<div class="panel activity-panel"><div class="recent-list">${activities.map((activity) => `<div class="recent-row"><span class="activity-icon">${icon("activity")}</span><span><strong>${escapeHtml(activity.text)}</strong><small>${formatDate(activity.date)}</small></span></div>`).join("")}</div></div>`
    : emptyState("Nenhuma atividade registrada.", "As ações do seu workspace aparecerão aqui.");
  const clearButton = activities.length ? `<button class="secondary-button" data-clear-history>${icon("trash-2")} Limpar histórico</button>` : "";
  return `<section class="page">${pageHeader("Gestão", "Histórico", "Consulte as atividades registradas no seu workspace.", clearButton)}${content}</section>`;
}

export function bindHistory() {
  document.querySelector("[data-clear-history]")?.addEventListener("click", () => {
    if (!window.confirm("Deseja realmente apagar todo o histórico de atividades? Essa ação não pode ser desfeita.")) return;
    clearActivities();
    showToast("Histórico apagado.");
    navigate("/app/history", true);
  });
}
