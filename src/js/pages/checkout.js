import { getCurrentUser, getState, getWorkspace, isAuthenticated } from "../core/store.js";
import { navigate } from "../core/router.js";
import { icon } from "../components/ui.js";
import { PLAN_CATALOG, planPrice, intervalLabel } from "../config/plans.js";

const API_URL = "http://localhost:3333";

export function checkoutPage(planCode = "pro") {
  const workspace = getWorkspace(); const user = getCurrentUser(); const plan = PLAN_CATALOG[planCode] || PLAN_CATALOG.pro;
  return `<div class="public-page checkout-page"><header class="public-header"><button class="back-public inline-back" data-route="/planos/pro">${icon("arrow-left")} Planos</button><div class="brand"><span class="brand-mark"><img src="fixflow.jpg" alt="FixFlow"></span><span>FixFlow</span></div><span class="secure-note">${icon("lock-keyhole")} Checkout seguro</span></header><div class="checkout-layout"><section><p class="eyebrow">Assinatura</p><h1>Seu ${plan.name} começa aqui.</h1><p class="checkout-intro">Revise os dados da empresa e continue para o checkout seguro. O plano só será ativado depois da confirmação do webhook.</p><div class="checkout-benefits"><h2>O que está incluído</h2><ul>${plan.features.slice(0, 7).map((feature) => `<li>${icon("check")} ${feature}</li>`).join("")}</ul></div></section><aside class="checkout-card"><div class="checkout-plan"><span class="plan-badge pro-badge">${plan.name.toUpperCase()}</span><strong>${planPrice(plan)} <small>/ ${intervalLabel(plan.interval)}</small></strong></div><dl><dt>Empresa</dt><dd>${workspace?.company || workspace?.owner || "Seu workspace"}</dd><dt>Email da conta</dt><dd>${user?.email || "-"}</dd><dt>Plano escolhido</dt><dd>FixFlow ${plan.name}</dd><dt>Periodicidade</dt><dd>Mensal</dd></dl><div class="checkout-total"><span>Total recorrente</span><strong>${planPrice(plan)} / mês</strong></div><p id="checkout-error" class="form-error" hidden></p><button id="checkout-submit" class="primary-button wide-button" data-plan="${plan.code}">Continuar para pagamento ${icon("arrow-up-right")}</button><p class="secure-note">${icon("shield-check")} O FixFlow não armazena dados de cartão.</p></aside></div></div>`;
}

export function bindCheckout(planCode = "pro") {
  if (!isAuthenticated()) { navigate("/login", true); return; }
  document.querySelectorAll("[data-route]").forEach((button) => { button.onclick = () => navigate(button.dataset.route); });
  document.querySelector("#checkout-submit").onclick = () => startCheckout(planCode);
}

async function startCheckout(planCode) {
  const button = document.querySelector("#checkout-submit"); const errorNode = document.querySelector("#checkout-error"); const session = getState().session;
  button.disabled = true; button.textContent = "Criando checkout...";
  try {
    const response = await fetch(`${API_URL}/api/billing/checkout`, { method: "POST", headers: { "content-type": "application/json", "x-user-id": session.userId, "x-workspace-id": session.workspaceId }, body: JSON.stringify({ planId: planCode }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || "CHECKOUT_FAILED");
    sessionStorage.setItem("fixflow.paymentId", result.paymentId); window.location.href = result.checkoutUrl;
  } catch (error) {
    errorNode.hidden = false; errorNode.textContent = error.message === "PAYMENT_GATEWAY_NOT_CONFIGURED" ? "O checkout seguro ainda precisa ser configurado no backend deste ambiente." : "Não foi possível iniciar o checkout. Tente novamente.";
    button.disabled = false; button.innerHTML = `Continuar para pagamento ${icon("arrow-up-right")}`;
  }
}

export function checkoutStatePage(state) {
  const copy = state === "success" ? { eyebrow: "Pagamento em confirmação", title: "Estamos confirmando seu pagamento.", text: "O plano só será considerado ativo depois da confirmação oficial recebida pelo backend.", action: "Ir para o dashboard", route: "/app/dashboard", icon: "clock-3" } : state === "pending" ? { eyebrow: "Pagamento em processamento", title: "Estamos confirmando seu pagamento.", text: "O plano será ativado assim que o gateway enviar uma confirmação válida. Você pode voltar ao dashboard sem perder o acompanhamento.", action: "Voltar ao dashboard", route: "/app/dashboard", icon: "clock-3" } : { eyebrow: "Pagamento não confirmado", title: "Não conseguimos confirmar o pagamento.", text: "Nenhum recurso Pro foi ativado. Confira o status no gateway e tente iniciar um novo checkout.", action: "Tentar novamente", route: "/checkout/pro", icon: "rotate-ccw" };
  return `<div class="public-page checkout-state-page"><div class="state-panel"><span class="state-icon">${icon(copy.icon)}</span><p class="eyebrow">${copy.eyebrow}</p><h1>${copy.title}</h1><p>${copy.text}</p><div id="payment-state" class="payment-state">Consultando o status oficial...</div><button class="primary-button" data-route="${copy.route}">${copy.action} ${icon("arrow-right")}</button></div></div>`;
}

export function bindCheckoutState(state) {
  document.querySelector("[data-route]").onclick = (event) => navigate(event.currentTarget.dataset.route);
  document.querySelector("#payment-state").textContent = state === "failed" ? "Status: pagamento não aprovado" : "Status: aguardando confirmação do gateway";
}
