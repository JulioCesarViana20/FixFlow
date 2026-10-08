import { applyTheme, deactivateLocalAccount, deleteLocalAccount, getAuthHeaders, getCurrentUser, getWorkspace, signOut, updatePreferences, updateWorkspace } from "../core/store.js";
import { icon, pageHeader } from "../components/ui.js";
import { navigate } from "../core/router.js";
import { escapeHtml } from "../utils/format.js";
import { formatInternationalPhone, formatBrazilianZipCode, formatCnpj, PHONE_COUNTRIES, validateInternationalPhone } from "../utils/validation.js";
import { API_URL } from "../config/api.js";

export function settingsPage() {
  const user = getCurrentUser() || {};
  const workspace = getWorkspace() || {};
  const preferences = workspace.preferences || {};
  const phoneCountry = workspace.phoneCountry || "BR";
  return `<section class="page settings-page">${pageHeader("Conta", "Configurações", "Gerencie perfil, empresa, preferências e acesso.")}<form id="settings-form"><div class="settings-panel"><div class="settings-panel-heading"><div><p class="eyebrow">Perfil</p><h2>Dados pessoais</h2></div><span class="settings-owner-badge">${icon("shield-check")} Proprietário</span></div><div class="form-grid"><label>Nome<input name="name" value="${escapeHtml(user.name)}" required></label><label>Email<input name="email" value="${escapeHtml(user.email)}" disabled></label><label>País do telefone<select name="phoneCountry">${PHONE_COUNTRIES.map(([code, name, dial]) => `<option value="${code}" ${code === phoneCountry ? "selected" : ""}>${name} (${dial})</option>`).join("")}</select></label><label>Telefone<input name="phone" inputmode="tel" placeholder="+55 11 99999-9999" value="${escapeHtml(workspace.phone)}"></label></div></div><div class="settings-panel"><p class="eyebrow">Empresa</p><h2>Dados do workspace</h2><div class="form-grid"><label>Nome da empresa<input name="company" value="${escapeHtml(workspace.company)}"></label><label>CNPJ<input name="cnpj" inputmode="numeric" maxlength="18" placeholder="00.000.000/0000-00" value="${escapeHtml(workspace.cnpj)}"></label><label>Email<input name="companyEmail" type="email" value="${escapeHtml(workspace.companyEmail)}"></label></div></div><div class="settings-panel"><p class="eyebrow">Endereço</p><h2>Onde sua empresa está localizada</h2><div class="form-grid"><label>Tipo de via<select name="addressType"><option value="Rua">Rua</option><option value="Avenida">Avenida</option><option value="Alameda">Alameda</option><option value="Travessa">Travessa</option><option value="Rodovia">Rodovia</option><option value="Outro">Outro</option></select></label><label>Endereço<input name="street" value="${escapeHtml(workspace.street || workspace.address)}"></label><label>Número<input name="addressNumber" value="${escapeHtml(workspace.addressNumber)}"></label><label>Complemento<input name="addressComplement" value="${escapeHtml(workspace.addressComplement)}"></label><label>Bairro<input name="neighborhood" value="${escapeHtml(workspace.neighborhood)}"></label><label>CEP<input name="zipCode" value="${escapeHtml(workspace.zipCode)}" inputmode="numeric" maxlength="9"></label><label>Cidade<input name="city" value="${escapeHtml(workspace.city)}"></label><label>Estado<input name="state" value="${escapeHtml(workspace.state)}"></label></div></div><div class="settings-panel"><p class="eyebrow">Preferências</p><h2>Experiência</h2><div class="form-grid"><label>Tema<select name="theme"><option value="dark" ${preferences.theme === "dark" ? "selected" : ""}>Escuro</option><option value="light" ${preferences.theme === "light" ? "selected" : ""}>Claro</option><option value="system" ${preferences.theme === "system" ? "selected" : ""}>Seguir preferência do sistema</option></select></label><label>Moeda<select name="currency"><option ${preferences.currency === "BRL" ? "selected" : ""}>BRL</option><option ${preferences.currency === "USD" ? "selected" : ""}>USD</option></select></label><label>Fuso horário<select name="timezone"><option ${preferences.timezone === "America/Sao_Paulo" ? "selected" : ""}>America/Sao_Paulo</option><option ${preferences.timezone === "UTC" ? "selected" : ""}>UTC</option></select></label><label class="checkbox-setting"><input type="checkbox" name="newOrder" ${preferences.notifications?.newOrder !== false ? "checked" : ""}> Notificar novas demandas</label><label class="checkbox-setting"><input type="checkbox" name="statusChange" ${preferences.notifications?.statusChange !== false ? "checked" : ""}> Notificar alterações de status</label><label class="checkbox-setting"><input type="checkbox" name="finance" ${preferences.notifications?.finance !== false ? "checked" : ""}> Notificar movimentações financeiras</label></div><button class="primary-button" type="submit">Salvar configurações</button><p id="settings-feedback" class="form-success" hidden></p></div></form><div class="settings-panel"><p class="eyebrow">Plano</p><h2>Plano atual: ${escapeHtml(getWorkspace().planCode || "free").toUpperCase()}</h2><p class="settings-copy">Consulte limites e gerencie sua assinatura na área de Cobranças.</p></div><section class="danger-zone" aria-labelledby="danger-title"><div class="danger-heading"><div><p class="eyebrow danger-eyebrow">Danger Zone</p><h2 id="danger-title">Ações críticas da sua conta</h2><p>Ações nesta área podem afetar o acesso ou os dados da empresa.</p></div><span class="danger-symbol">${icon("triangle-alert")}</span></div><div id="danger-feedback" class="danger-feedback" role="status" aria-live="polite" hidden></div><div class="danger-actions"><article class="danger-action"><div><h3>Desativar conta</h3><p>Bloqueie temporariamente o acesso sem excluir permanentemente os dados.</p></div><button class="secondary-button" data-danger="deactivate">Desativar conta</button></article><article class="danger-action destructive"><div><h3>Excluir conta permanentemente</h3><p>Exclua o workspace e os dados associados conforme a política de retenção.</p></div><button class="danger-button" data-danger="delete">Excluir permanentemente</button></article></div></section><div id="danger-modal-root"></div></section>`;
}

export function bindSettings() {
  const settingsForm = document.querySelector("#settings-form");
  const applyMask = (selector, formatter) => {
    const input = settingsForm?.querySelector(selector);
    if (!input) return;
    input.value = formatter(input.value);
    input.addEventListener("input", () => { input.value = formatter(input.value); });
  };
  const phoneInput = settingsForm?.querySelector('[name="phone"]');
  const phoneCountry = settingsForm?.querySelector('[name="phoneCountry"]');
  phoneInput?.addEventListener("blur", () => { phoneInput.value = formatInternationalPhone(phoneInput.value, phoneCountry.value); });
  applyMask('[name="cnpj"]', formatCnpj);
  applyMask('[name="zipCode"]', formatBrazilianZipCode);
  settingsForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const phoneValidation = values.phone ? validateInternationalPhone(values.phone, values.phoneCountry) : { valid: true, value: "" };
    if (!phoneValidation.valid) { const feedback = document.querySelector("#settings-feedback"); feedback.hidden = false; feedback.textContent = phoneValidation.message; return; }
    updateWorkspace({ owner: values.name, phone: phoneValidation.value, phoneCountry: values.phoneCountry, company: values.company, cnpj: values.cnpj, companyEmail: values.companyEmail, addressType: values.addressType, street: values.street, addressNumber: values.addressNumber, addressComplement: values.addressComplement, neighborhood: values.neighborhood, zipCode: values.zipCode, city: values.city, state: values.state });
    updatePreferences({ theme: values.theme, currency: values.currency, billingPeriod: values.billingPeriod || "month", timezone: values.timezone, notifications: { newOrder: Boolean(values.newOrder), statusChange: Boolean(values.statusChange), finance: Boolean(values.finance) } });
    applyTheme();
    const feedback = document.querySelector("#settings-feedback");
    feedback.hidden = false;
    feedback.textContent = "Configurações salvas.";
  });
  document.querySelectorAll("[data-danger]").forEach((button) => button.addEventListener("click", () => openDangerModal(button.dataset.danger)));
}

function authHeaders() {
  return getAuthHeaders(true);
}

function openDangerModal(action) {
  const root = document.querySelector("#danger-modal-root");
  const isDelete = action === "delete";
  const title = action === "deactivate" ? "Desativar conta?" : "Excluir conta permanentemente";
  const body = action === "deactivate" ? "O acesso será bloqueado temporariamente. Nenhum dado será apagado e a reativação dependerá de um fluxo autorizado." : "Esta ação é potencialmente irreversível. Ela afetará o workspace, usuários, contatos, demandas, histórico e dados associados. Backups podem seguir sua política de retenção.";
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
    try {
      const response = await fetch(`${API_URL}${endpoints[action]}`, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "REQUEST_FAILED");
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
    }
    const localCompleted = action === "delete"
      ? await deleteLocalAccount(payload.confirmation, payload.password)
      : deactivateLocalAccount();
    if (!localCompleted) throw new Error("LOCAL_ACCOUNT_OPERATION_FAILED");
    closeDangerModal();
    showDangerFeedback(action === "delete" ? "A conta foi excluída." : "A conta foi desativada.", false);
    if (action === "delete" || action === "deactivate") { signOut(); navigate("/"); }
  } catch (error) {
    if (button) { button.disabled = false; button.textContent = "Tentar novamente"; }
    showDangerFeedback(error.message === "OWNER_REQUIRED" ? "Apenas o proprietário pode executar esta ação." : error.message === "PAYMENT_GATEWAY_NOT_CONFIGURED" ? "O gateway ainda não está configurado; nenhuma alteração foi aplicada." : error.message === "REAUTHENTICATION_FAILED" ? "A senha atual não foi confirmada." : error.message === "ACCOUNT_ALREADY_DEACTIVATED" ? "Esta conta já está desativada." : error.message === "LOCAL_ACCOUNT_OPERATION_FAILED" ? "Não foi possível atualizar os dados locais da conta." : "Não foi possível concluir a operação.", true);
  }
}

function showDangerFeedback(message, error) { const node = document.querySelector("#danger-feedback"); if (!node) return; node.hidden = false; node.className = `danger-feedback ${error ? "error" : "success"}`; node.textContent = message; }
