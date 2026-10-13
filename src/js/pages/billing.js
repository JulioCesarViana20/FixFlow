import { cancelSubscription, getAuthHeaders, getState, getWorkspace, updatePreferences } from "../core/store.js";
import { bindModal, pageHeader, icon, showToast } from "../components/ui.js";
import { API_URL } from "../config/api.js";
import { getCurrentPlan, getLimit, getSubscriptionStatus, getUsage, limitText } from "../core/plan-access.js";
import { isPlanDowngrade, PLAN_CATALOG, planPriceCents, SUBSCRIPTION_STATUSES } from "../config/plans.js";
import { convertFromBrl, formatMoney, getBrlRates } from "../services/exchange-rates.js";
import { formatDate } from "../utils/format.js";

export function billingPage() {
  const workspace = getWorkspace();
  const plan = getCurrentPlan(workspace);
  const preferences = workspace.preferences || {};
  const usage = [["Demandas", "orders"], ["Clientes", "clients"], ["Financeiro", "transactions"]]
    .map(([label, resource]) => `<span><strong>${getUsage(workspace, resource)}</strong>/${limitText(getLimit(workspace, resource))} ${label.toLowerCase()}</span>`).join("");
  return `<section class="page">${pageHeader("Cobrança", "Planos para o seu negócio", "Compare capacidade, recursos e escolha o próximo passo.")}<div id="subscription-summary">${subscriptionSummary(workspace, plan, preferences)}</div><div class="panel billing-status"><div><p class="eyebrow">Plano atual</p><h2>${plan.name}</h2></div><div class="plan-usage">${usage}</div></div><div class="billing-controls panel"><div><p class="eyebrow">Exibição dos preços</p><strong>Configure moeda e período</strong></div><div class="billing-control-group" role="group" aria-label="Moeda"><button class="currency-option ${preferences.currency !== "USD" ? "selected" : ""}" data-currency="BRL">🇧🇷 BRL</button><button class="currency-option ${preferences.currency === "USD" ? "selected" : ""}" data-currency="USD">🇺🇸 USD</button></div><div class="period-switch" role="group" aria-label="Período de cobrança"><button class="${preferences.billingPeriod !== "year" ? "selected" : ""}" data-period="month">Mensal</button><button class="${preferences.billingPeriod === "year" ? "selected" : ""}" data-period="year">Anual <span>economize</span></button></div><small id="exchange-status">Consultando cotação atual...</small></div><div id="billing-plans" class="pricing-grid"></div><div class="panel billing-note"><strong>Pagamento seguro</strong><span>O plano só será ativado após a confirmação do pagamento pelo backend e webhook validado. A moeda aqui controla apenas a exibição.</span><div class="billing-legal-links"><a href="#/termos">Termos de Uso</a><a href="#/privacidade">Política de Privacidade</a><a href="mailto:fixflowconsult@gmail.com">Dúvidas sobre cobrança</a></div></div><div id="subscription-modal-root"></div></section>`;
}

function subscriptionSummary(workspace, plan, preferences) {
  const subscription = workspace.subscription || {};
  const status = getSubscriptionStatus(workspace);
  const paid = plan.code !== "free";
  const statusLabels = {
    [SUBSCRIPTION_STATUSES.FREE]: "Plano gratuito",
    [SUBSCRIPTION_STATUSES.ACTIVE_PRO]: "Ativa",
    [SUBSCRIPTION_STATUSES.ACTIVE_BUSINESS]: "Ativa",
    [SUBSCRIPTION_STATUSES.CANCEL_AT_PERIOD_END]: "Cancelada no fim do período",
    [SUBSCRIPTION_STATUSES.EXPIRED]: "Expirada",
    [SUBSCRIPTION_STATUSES.PAYMENT_PENDING]: "Pagamento pendente",
    [SUBSCRIPTION_STATUSES.PAYMENT_FAILED]: "Pagamento não aprovado",
  };
  const end = subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "Não se aplica";
  const amount = paid ? formatMoney(planPriceCents(plan, subscription.billingPeriod || preferences.billingPeriod || "month") / 100, subscription.currency || preferences.currency || "BRL") : "Grátis";
  return `<section class="panel subscription-summary"><div><p class="eyebrow">Minha assinatura</p><h2>${plan.name}</h2><span class="subscription-status ${status.toLowerCase()}">${statusLabels[status] || status}</span></div><div class="subscription-details"><span><small>Período</small>${subscription.billingPeriod === "year" ? "Anual" : "Mensal"}</span><span><small>Valor</small>${amount}</span><span><small>${status === SUBSCRIPTION_STATUSES.CANCEL_AT_PERIOD_END ? "Acesso até" : "Próxima cobrança"}</small>${end}</span></div><div class="subscription-actions"><button class="secondary-button" data-manage-subscription>Gerenciar assinatura</button>${paid && status !== SUBSCRIPTION_STATUSES.CANCEL_AT_PERIOD_END ? '<button class="danger-button" data-cancel-subscription>Cancelar assinatura</button>' : ""}</div></section>`;
}

export async function bindBilling() {
  const workspace = getWorkspace();
  const plansNode = document.querySelector("#billing-plans");
  const modalRoot = document.querySelector("#subscription-modal-root");
  let rates;
  try {
    rates = await getBrlRates();
    document.querySelector("#exchange-status").textContent = `Cotação BRL/USD: ${rates.rates.USD.toFixed(4)} · fonte ${rates.source} · ${rates.updatedAt}`;
  } catch {
    document.querySelector("#exchange-status").textContent = "Cotação indisponível. Selecione BRL ou tente novamente mais tarde.";
  }
  const render = () => {
    const preferences = getWorkspace().preferences || {};
    plansNode.innerHTML = Object.values(PLAN_CATALOG).map((plan) => planCard(plan, preferences.currency || "BRL", preferences.billingPeriod || "month", rates)).join("");
    plansNode.querySelectorAll("[data-plan]").forEach((button) => {
      button.onclick = () => startCheckout(button.dataset.plan);
    });
    document.querySelector("#subscription-summary").innerHTML = subscriptionSummary(getWorkspace(), getCurrentPlan(getWorkspace()), getWorkspace().preferences || {});
    document.querySelector("[data-cancel-subscription]")?.addEventListener("click", () => openCancelModal());
    document.querySelector("[data-manage-subscription]")?.addEventListener("click", () => document.querySelector("#subscription-summary").scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  const openCancelModal = () => {
    const subscription = getWorkspace().subscription;
    modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal subscription-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-subscription-title"><div class="modal-heading"><div><p class="eyebrow">Minha assinatura</p><h2 id="cancel-subscription-title">Cancelar assinatura?</h2></div><button class="icon-button" data-close-subscription-modal aria-label="Fechar">${icon("x")}</button></div><p>Seu plano ${getCurrentPlan(getWorkspace()).name} continuará disponível até <strong>${formatDate(subscription.currentPeriodEnd)}</strong>. Depois disso, a conta retornará ao plano Free e nenhuma nova renovação será cobrada.</p><p class="form-hint">Este fluxo cancela a renovação. Ele não solicita reembolso nem apaga seus dados.</p><div class="modal-actions"><button class="secondary-button" data-close-subscription-modal>Manter assinatura</button><button class="danger-button" data-confirm-cancel>Continuar cancelamento</button></div></section></div>`;
    bindModal(modalRoot);
    modalRoot.querySelector("[data-confirm-cancel]").onclick = async (event) => {
      const confirmButton = event.currentTarget;
      confirmButton.disabled = true;
      confirmButton.textContent = "Cancelando...";
      try {
        const response = await fetch(`${API_URL}/api/billing/cancel`, {
          method: "POST",
          headers: getAuthHeaders(true),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "CANCELLATION_FAILED");
        cancelSubscription();
        modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal subscription-modal" role="dialog" aria-modal="true"><div class="modal-heading"><div><p class="eyebrow">Minha assinatura</p><h2>Assinatura cancelada</h2></div><button class="icon-button" data-close-subscription-modal aria-label="Fechar">${icon("x")}</button></div><p>Você não será cobrado na próxima renovação. Seu acesso pago permanece disponível até <strong>${formatDate(getWorkspace().subscription.currentPeriodEnd)}</strong>.</p><div class="modal-actions"><button class="primary-button" data-close-subscription-modal>Entendi</button></div></section></div>`;
        modalRoot.querySelectorAll("[data-close-subscription-modal]").forEach((button) => { button.onclick = () => { modalRoot.innerHTML = ""; render(); }; });
        render();
      } catch (error) {
        confirmButton.disabled = false;
        confirmButton.textContent = "Continuar cancelamento";
        showToast(error.message === "PAYMENT_GATEWAY_NOT_CONFIGURED"
          ? "O cancelamento online ainda não está disponível."
          : "Não foi possível cancelar esta assinatura.");
      }
    };
  };
  document.querySelectorAll("[data-currency]").forEach((button) => button.addEventListener("click", () => {
    updatePreferences({ currency: button.dataset.currency });
    render();
    document.querySelectorAll("[data-currency]").forEach((item) => item.classList.toggle("selected", item.dataset.currency === button.dataset.currency));
  }));
  document.querySelectorAll("[data-period]").forEach((button) => button.addEventListener("click", () => {
    updatePreferences({ billingPeriod: button.dataset.period });
    render();
    document.querySelectorAll("[data-period]").forEach((item) => item.classList.toggle("selected", item.dataset.period === button.dataset.period));
  }));
  render();
}

function planCard(plan, currency, period, rates) {
  const brl = planPriceCents(plan, period) / 100;
  const value = rates ? formatMoney(convertFromBrl(brl, currency, rates), currency) : currency === "BRL" ? formatMoney(brl, "BRL") : "Cotação indisponível";
  const current = getWorkspace().planCode === plan.code;
  const annualSaving = period === "year" && plan.priceCents ? Math.round((1 - plan.annualPriceCents / (plan.priceCents * 12)) * 100) : 0;
  return `<article class="price-card ${plan.code === "pro" ? "featured" : ""} ${plan.code === "business" ? "business-card" : ""}"><p class="eyebrow">${plan.name.toUpperCase()}</p><h3>${value} <small>/ ${period === "year" ? "ano" : "mês"}</small></h3>${annualSaving ? `<span class="annual-saving">-${annualSaving}% no anual</span>` : ""}<p>${plan.description}</p><ul>${plan.features.map((feature) => `<li>${icon("check")} ${feature}</li>`).join("")}</ul>${current ? '<span class="secondary-button plan-current">Plano atual</span>' : `<button class="primary-button" data-plan="${plan.code}">Escolher este plano</button>`}</article>`;
}

async function startCheckout(planId) {
  const currentPlan = getCurrentPlan(getWorkspace());
  if (isPlanDowngrade(currentPlan.code, planId)) {
    showToast("Não é possível concluir esta ação: não é permitido mudar para um plano inferior ao atual.");
    return;
  }
  const session = getState().session;
  try {
    const response = await fetch(`${API_URL}/api/billing/checkout`, { method: "POST", headers: getAuthHeaders(true), body: JSON.stringify({ planId }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "CHECKOUT_FAILED");
    window.location.href = result.checkoutUrl;
  } catch (error) {
    showToast(error.message === "PAYMENT_GATEWAY_NOT_CONFIGURED" ? "O pagamento online ainda não está disponível." : error.message === "PLAN_DOWNGRADE_NOT_ALLOWED" ? "Não é possível mudar para um plano inferior ao atual." : "Não conseguimos iniciar o pagamento.");
  }
}
