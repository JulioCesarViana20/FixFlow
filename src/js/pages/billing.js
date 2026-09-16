import { getState } from "../core/store.js";
import { pageHeader, icon, showToast } from "../components/ui.js";

export function billingPage() {
  return `<section class="page">${pageHeader("Billing", "Planos e assinatura", "Escolha o plano que acompanha o crescimento da sua empresa.")}<div id="billing-status" class="panel billing-status">Carregando planos oficiais...</div><div id="billing-plans" class="pricing-grid"></div><div class="panel billing-note"><strong>Pagamento seguro</strong><span>A confirmação do plano acontece somente após o webhook validado pelo backend. O redirecionamento do checkout não libera recursos por si só.</span></div></section>`;
}

export async function bindBilling() {
  const plansNode = document.querySelector("#billing-plans");
  try {
    const response = await fetch("http://localhost:3333/api/billing/plans");
    if (!response.ok) throw new Error("PLANS_UNAVAILABLE");
    const plans = await response.json();
    plansNode.innerHTML = plans.map(planCard).join("");
    plansNode.querySelectorAll("[data-plan]").forEach((button) => {
      button.onclick = () => startCheckout(button.dataset.plan);
    });
    document.querySelector("#billing-status").textContent = "Planos disponíveis para este ambiente.";
  } catch {
    document.querySelector("#billing-status").textContent = "Não foi possível carregar os planos agora. Verifique se a API de billing está ativa.";
  }
}

function planCard(plan) {
  const price = (plan.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `<article class="price-card ${plan.code === "pro" ? "featured" : ""}"><p class="eyebrow">${plan.name.toUpperCase()}</p><h3>${price} <small>/mês</small></h3><p>Recursos oficiais consultados pelo backend.</p><ul>${plan.features.map((feature) => `<li>${icon("check")} ${feature}</li>`).join("")}</ul><button class="${plan.code === "free" ? "secondary-button" : "primary-button"}" data-plan="${plan.code}">${plan.code === "free" ? "Plano atual" : "Fazer upgrade"}</button></article>`;
}

async function startCheckout(planId) {
  const session = getState().session;
  try {
    const response = await fetch("http://localhost:3333/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": session.userId, "x-workspace-id": session.workspaceId },
      body: JSON.stringify({ planId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "CHECKOUT_FAILED");
    window.location.href = result.checkoutUrl;
  } catch (error) {
    showToast(error.message === "PAYMENT_GATEWAY_NOT_CONFIGURED" ? "Gateway ainda não configurado neste ambiente." : "Não foi possível iniciar o checkout.");
  }
}
