import { addClient, deleteClient, deleteClients, getWorkspace, updateClient } from "../core/store.js";
import { escapeHtml, formatCurrency, getInitials } from "../utils/format.js";
import { formatInternationalPhone, formatCnpj, formatCpf, PHONE_COUNTRIES, validateInternationalPhone, validateCpf, validateCnpj, validateEmail } from "../utils/validation.js";
import { emptyState, hydrateIcons, icon, pageHeader, primaryButton, showPlanLimitError, showToast } from "../components/ui.js";

export function clientsPage() {
  const clients = getWorkspace().clients || [];
  return `<section class="page">${pageHeader("Workspace", "Clientes", "Cadastre pessoas e empresas com dados consistentes.", primaryButton("Novo cliente", "new-client"))}<div class="table-panel panel"><div class="table-toolbar"><label class="search-field">${icon("search")}<input id="client-search" placeholder="Pesquisar cliente" type="search"></label><span class="panel-subtitle">${clients.length} cliente(s)</span><div id="client-selection-actions" class="selection-actions"><span data-selection-count>0 selecionados</span><button class="danger-button" data-bulk-delete-clients>Excluir selecionados</button></div></div><div id="clients-list">${clients.length ? clientsTable(clients) : emptyState("Você ainda não possui clientes cadastrados.", "Cadastre um cliente para relacioná-lo às suas demandas.", "new-client", "Novo cliente")}</div></div><div id="client-modal-root"></div></section>`;
}

function clientLabel(client) { return client.type === "company" ? client.tradeName || client.legalName : client.name; }

function clientsTable(clients) {
  return `<div class="responsive-table"><table class="data-table"><thead><tr><th><input type="checkbox" data-select-all-clients aria-label="Selecionar todos os clientes"></th><th>Cliente</th><th>Tipo</th><th>Contato</th><th>Demandas</th><th>Movimentado</th><th></th></tr></thead><tbody>${clients.map((client) => {
    const workspace = getWorkspace();
    const orders = workspace.orders.filter((order) => order.clientId === client.id);
    const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    return `<tr><td><input type="checkbox" data-select-client="${client.id}" aria-label="Selecionar ${escapeHtml(clientLabel(client))}"></td><td><span class="client-cell"><span class="mini-avatar">${getInitials(clientLabel(client))}</span><strong>${escapeHtml(clientLabel(client))}</strong></span><small>${escapeHtml(client.type === "company" ? client.legalName : client.cpf)}</small></td><td>${client.type === "company" ? "Pessoa jurídica" : "Pessoa física"}</td><td>${escapeHtml(client.email || client.phone || "Sem contato")}</td><td>${orders.length}</td><td>${formatCurrency(total)}</td><td><div class="table-actions"><button class="table-action-button" data-edit-client="${client.id}" aria-label="Editar cliente" title="Editar cliente">${icon("pencil")}<span>Editar</span></button><button class="table-action-button danger-action" data-delete-client="${client.id}" aria-label="Excluir cliente" title="Excluir cliente">${icon("trash-2")}<span>Excluir</span></button></div></td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function clientForm(client = {}) {
  const company = client.type === "company";
  const phoneCountry = client.phoneCountry || "BR";
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="client-modal-title"><div class="modal-heading"><div><p class="eyebrow">Cadastro</p><h2 id="client-modal-title">${client.id ? "Editar cliente" : "Novo cliente"}</h2></div><button class="icon-button" data-close-modal aria-label="Fechar">${icon("x")}</button></div><form id="client-form" data-client-id="${client.id || ""}" class="form-grid"><label>Tipo de cliente *<select name="type" id="client-type"><option value="individual" ${!company ? "selected" : ""}>Pessoa física</option><option value="company" ${company ? "selected" : ""}>Pessoa jurídica</option></select></label><span></span><div id="individual-fields" class="${company ? "is-hidden" : ""}"><label>Nome completo *<input name="name" value="${escapeHtml(client.name)}"></label><label>CPF <span class="field-optional">(opcional)</span><input name="cpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" value="${escapeHtml(client.cpf)}"></label></div><div id="company-fields" class="${company ? "" : "is-hidden"}"><label>Razão social *<input name="legalName" value="${escapeHtml(client.legalName)}"></label><label>Nome fantasia<input name="tradeName" value="${escapeHtml(client.tradeName)}"></label><label>CNPJ <span class="field-optional">(opcional)</span><input name="cnpj" inputmode="numeric" maxlength="18" placeholder="00.000.000/0000-00" value="${escapeHtml(client.cnpj)}"></label></div><label>Email <span class="field-optional">(opcional)</span><input name="email" type="email" value="${escapeHtml(client.email)}"></label><label>País do telefone<select name="phoneCountry" id="phone-country">${PHONE_COUNTRIES.map(([code, name, dial]) => `<option value="${code}" ${code === phoneCountry ? "selected" : ""}>${name} (${dial})</option>`).join("")}</select></label><label>Telefone <span class="field-optional">(opcional)</span><input name="phone" inputmode="tel" placeholder="+55 11 99999-9999" value="${escapeHtml(client.phone)}"></label><label class="full-field">Observações<textarea name="notes">${escapeHtml(client.notes)}</textarea></label><p id="client-form-error" class="form-error full-field" hidden></p><div class="modal-actions full-field"><button type="button" class="secondary-button" data-close-modal>Cancelar</button><button class="primary-button" type="submit">Salvar cliente</button></div></form></section></div>`;
}

export function bindClients() {
  const selected = new Set();
  const root = document.querySelector("#client-modal-root");
  const updateSelection = () => {
    const toolbar = document.querySelector("#client-selection-actions");
    toolbar.hidden = !selected.size;
    toolbar.querySelector("[data-selection-count]").textContent = `${selected.size} selecionado${selected.size === 1 ? "" : "s"}`;
  };
  const open = (client = {}) => {
    root.innerHTML = clientForm(client);
    const form = root.querySelector("form");
    const type = root.querySelector("#client-type");
    const applyMask = (selector, formatter) => {
      const input = root.querySelector(selector);
      if (!input) return;
      input.value = formatter(input.value);
      input.addEventListener("input", () => { input.value = formatter(input.value); });
    };
    applyMask('[name="cpf"]', formatCpf);
    applyMask('[name="cnpj"]', formatCnpj);
    const phone = root.querySelector('[name="phone"]');
    const country = root.querySelector("#phone-country");
    const formatPhone = () => { phone.value = formatInternationalPhone(phone.value, country.value); };
    phone.addEventListener("blur", formatPhone);
    country.addEventListener("change", formatPhone);
    const toggle = () => { root.querySelector("#individual-fields").classList.toggle("is-hidden", type.value === "company"); root.querySelector("#company-fields").classList.toggle("is-hidden", type.value !== "company"); };
    type.onchange = toggle;
    root.querySelectorAll("[data-close-modal]").forEach((button) => { button.onclick = () => { root.innerHTML = ""; }; });
    form.onsubmit = (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const error = root.querySelector("#client-form-error");
      const identity = data.type === "company"
        ? (data.cnpj ? validateCnpj(data.cnpj) : { valid: true })
        : (data.cpf ? validateCpf(data.cpf) : { valid: true });
      const email = data.email ? validateEmail(data.email) : { valid: true, value: "" };
      const phoneValidation = data.phone ? validateInternationalPhone(data.phone, data.phoneCountry) : { valid: true, value: "" };
      const normalizedEmail = data.email.trim().toLowerCase();
      const normalizedDocument = data.type === "company" ? data.cnpj.replace(/\D/g, "") : data.cpf.replace(/\D/g, "");
      const duplicate = (getWorkspace().clients || []).some((item) => item.id !== form.dataset.clientId && (
        (normalizedDocument && (data.type === "company" ? item.cnpj : item.cpf) === normalizedDocument) ||
        (normalizedEmail && item.email === normalizedEmail)
      ));
      if (!identity.valid) return showError(error, identity.message);
      if (!email.valid) return showError(error, "Digite um email válido.");
      if (!phoneValidation.valid) return showError(error, phoneValidation.message);
      data.phone = phoneValidation.value;
      if (duplicate) return showError(error, "Já existe um cliente cadastrado com essas informações.");
      try {
        if (form.dataset.clientId) updateClient(form.dataset.clientId, data); else addClient(data);
        showToast(form.dataset.clientId ? "Cliente atualizado." : "Cliente cadastrado.");
        window.location.hash = "#/app/clients";
      } catch (exception) {
        if (exception.message === "PLAN_LIMIT_REACHED") showPlanLimitError(error, exception);
        else showError(error, exception.message === "DUPLICATE_CLIENT" ? "Este cliente já está cadastrado." : "Não foi possível salvar o cliente.");
      }
    };
  };
  document.querySelectorAll("[data-action=new-client]").forEach((button) => { button.onclick = () => open(); });
  document.querySelectorAll("[data-edit-client]").forEach((button) => { button.onclick = () => open(getWorkspace().clients.find((client) => client.id === button.dataset.editClient)); });
  document.querySelectorAll("[data-delete-client]").forEach((button) => { button.onclick = () => { if (window.confirm("Excluir este cliente?")) { deleteClient(button.dataset.deleteClient); window.location.hash = "#/app/clients"; } }; });
  const renderList = () => {
    const query = (document.querySelector("#client-search")?.value || "").toLowerCase();
    document.querySelector("#clients-list").innerHTML = clientsTable((getWorkspace().clients || []).filter((client) => `${clientLabel(client)} ${client.email} ${client.cpf} ${client.cnpj}`.toLowerCase().includes(query)));
    hydrateIcons();
    document.querySelectorAll("[data-select-client]").forEach((input) => {
      input.checked = selected.has(input.dataset.selectClient);
      input.addEventListener("change", () => { input.checked ? selected.add(input.dataset.selectClient) : selected.delete(input.dataset.selectClient); updateSelection(); });
    });
    document.querySelector("[data-select-all-clients]")?.addEventListener("change", (event) => {
      document.querySelectorAll("[data-select-client]").forEach((input) => { input.checked = event.target.checked; event.target.checked ? selected.add(input.dataset.selectClient) : selected.delete(input.dataset.selectClient); });
      updateSelection();
    });
    document.querySelectorAll("[data-edit-client]").forEach((button) => {
      button.onclick = () => open(getWorkspace().clients.find((client) => client.id === button.dataset.editClient));
    });
    document.querySelectorAll("[data-delete-client]").forEach((button) => {
      button.onclick = () => {
        if (!window.confirm("Excluir este cliente?")) return;
        deleteClient(button.dataset.deleteClient);
        window.location.hash = "#/app/clients";
      };
    });
  };
  document.querySelector("#client-search")?.addEventListener("input", renderList);
  document.querySelector("#client-selection-actions").hidden = true;
  document.querySelector("[data-bulk-delete-clients]").onclick = () => {
    if (!selected.size || !window.confirm(`Excluir ${selected.size} cliente${selected.size === 1 ? "" : "s"} selecionado${selected.size === 1 ? "" : "s"}?`)) return;
    const count = deleteClients([...selected]);
    selected.clear();
    showToast(`${count} cliente${count === 1 ? "" : "s"} excluído${count === 1 ? "" : "s"}.`);
    window.location.hash = "#/app/clients";
  };
  renderList();
}

function showError(node, message) { node.hidden = false; node.textContent = message; }
