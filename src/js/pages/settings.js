import { getState, signOut } from "../core/store.js";
import { icon, pageHeader } from "../components/ui.js";
import { navigate } from "../core/router.js";

const API_URL = "http://localhost:3333";

export function settingsPage() {
  return `<section class="page settings-page">${pageHeader("Conta", "Configurações", "Gerencie sua conta, assinatura e dados do workspace.")}<div class="settings-panel"><div class="settings-panel-heading"><div><p class="eyebrow">Conta</p><h2>Preferências do workspace</h2></div><span class="settings-owner-badge">${icon("shield-check")} Proprietário</span></div><p class="settings-copy">Ações administrativas e dados da sua empresa ficam protegidos pela autorização do workspace.</p></div><section class="danger-zone" aria-labelledby="danger-title"><div class="danger-heading"><div><p class="eyebrow danger-eyebrow">Danger Zone</p><h2 id="danger-title">Ações críticas da sua conta</h2><p>Ações nesta área podem afetar o acesso ou os dados da empresa. O backend exige que você seja OWNER.</p></div><span class="danger-symbol">${icon("triangle-alert")}</span></div><div id="danger-feedback" class="danger-feedback" role="status" aria-live="polite" hidden></div><div class="danger-actions"><article class="danger-action"><div><h3>Desativar conta</h3><p>Bloqueie temporariamente o acesso sem excluir permanentemente os dados.</p></div><button class="secondary-button" data-danger="deactivate">Desativar conta</button></article><article class="danger-action destructive"><div><h3>Excluir conta permanentemente</h3><p>Exclua a conta, o workspace e os dados associados conforme a política de retenção. Esta ação não deve ser considerada reversível.</p></div><button class="danger-button" data-danger="delete">Excluir permanentemente</button></article></div></section><div id="danger-modal-root"></div></section>`;
}

export function bindSettings() {
  document.querySelectorAll("[data-danger]").forEach((button) => button.addEventListener("click", () => openDangerModal(button.dataset.danger)));
}

function authHeaders() {
  const session = getState().session;
  return { "content-type": "application/json", "x-user-id": session?.userId || "", "x-workspace-id": session?.workspaceId || "" };
}

function openDangerModal(action) {
  const root = document.querySelector("#danger-modal-root");
  const isDelete = action === "delete";
  const title = action === "deactivate" ? "Desativar conta?" : "Excluir conta permanentemente";
  const body = action === "deactivate" ? "O acesso será bloqueado temporariamente. Nenhum dado será apagado e a reativação dependerá de um fluxo autorizado." : "Esta ação é potencialmente irreversível. Ela afetará o workspace, usuários, clientes, ordens, histórico e dados associados. Backups podem seguir sua política de retenção.";
  root.innerHTML = `<div class="modal-backdrop danger-modal-backdrop" role="presentation"><section class="modal danger-modal" role="dialog" aria-modal="true" aria-labelledby="danger-modal-title"><div class="modal-heading"><div><p class="eyebrow danger-eyebrow">Confirmação necessária</p><h2 id="danger-modal-title">${title}</h2></div><button class="icon-button" data-close-modal aria-label="Fechar">${icon("x")}</button></div><p class="modal-copy">${body}</p>${isDelete ? '<form id="delete-confirm-form"><label>Digite <strong>DELETE MY FIXFLOW ACCOUNT</strong><input name="confirmation" required autocomplete="off" spellcheck="false"></label><label>Senha atual<input name="password" type="password" required autocomplete="current-password"></label><button class="danger-button" type="submit">Excluir permanentemente</button></form>' : '<div class="modal-actions"><button class="secondary-button" data-close-modal>Voltar</button><button class="danger-button" data-confirm-action="deactivate">Desativar conta</button></div>'}</section></div>`;
  root.querySelectorAll("[data-close-modal]").forEach((button) => { button.onclick = closeDangerModal; });
  root.querySelector("[data-confirm-action]")?.addEventListener("click", () => runDangerAction(action));
  root.querySelector("#delete-confirm-form")?.addEventListener("submit", (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); runDangerAction("delete", { confirmation: form.get("confirmation"), password: form.get("password") }); });
  root.querySelector("input")?.focus();
}

function closeDangerModal() { document.querySelector("#danger-modal-root").innerHTML = ""; }

async function runDangerAction(action, payload = {}) {
  const button = document.querySelector("[data-confirm-action], #delete-confirm-form button[type=submit]");
  if (button) { button.disabled = true; button.textContent = "Processando..."; }
  const endpoints = { deactivate: "/api/account/deactivate", delete: "/api/account/delete" };
  try {
    const response = await fetch(`${API_URL}${endpoints[action]}`, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "REQUEST_FAILED");
    closeDangerModal();
    showDangerFeedback(action === "delete" ? "A conta foi excluída." : "Operação concluída.", false);
    if (action === "delete" || action === "deactivate") { signOut(); navigate("/"); }
  } catch (error) {
    if (button) { button.disabled = false; button.textContent = "Tentar novamente"; }
    showDangerFeedback(error.message === "OWNER_REQUIRED" ? "Apenas o proprietário pode executar esta ação." : error.message === "PAYMENT_GATEWAY_NOT_CONFIGURED" ? "O gateway ainda não está configurado; nenhuma alteração foi aplicada." : error.message === "REAUTHENTICATION_FAILED" ? "A senha atual não foi confirmada." : "Não foi possível concluir a operação.", true);
  }
}

function showDangerFeedback(message, error) { const node = document.querySelector("#danger-feedback"); if (!node) return; node.hidden = false; node.className = `danger-feedback ${error ? "error" : "success"}`; node.textContent = message; }
