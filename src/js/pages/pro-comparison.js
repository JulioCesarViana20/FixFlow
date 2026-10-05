import { navigate } from "../core/router.js";
import { getWorkspace, isAuthenticated } from "../core/store.js";
import { icon } from "../components/ui.js";
import { PLAN_CATALOG, planPrice, intervalLabel } from "../config/plans.js";
import { API_URL } from "../config/api.js";

export function proComparisonPage() {
  const currentPlan = getWorkspace()?.planCode || "free";
  const alreadyPro = currentPlan === "pro";
  const card = (plan) => { const featured = plan.code === "pro"; const current = currentPlan === plan.code; const route = plan.code === "free" ? (isAuthenticated() ? "/app/dashboard" : "/cadastro") : `/checkout/${plan.code}`; return `<article class="comparison-card ${featured ? "pro-card" : ""} ${plan.code === "business" ? "business-card" : ""}"><div class="comparison-card-head"><div><p class="eyebrow ${featured ? "accent-label" : ""}">${plan.name}</p><h2>${plan.code === "free" ? "Para começar" : plan.code === "pro" ? "Para crescer sem travar" : "Para operar em escala"}</h2></div><span class="plan-badge ${featured ? "pro-badge" : ""}">${featured ? "Mais escolhido" : plan.code === "business" ? "Máximo controle" : "Essencial"}</span></div><p class="comparison-price">${plan.priceCents ? `${planPrice(plan)} <small>/ ${intervalLabel(plan.interval)}</small>` : "Gratuito"}</p>${featured ? '<p class="price-caption">Tudo do Free, com mais capacidade e automação.</p>' : plan.code === "business" ? '<p class="price-caption">Tudo do Pro, com equipe, API e auditoria.</p>' : ""}<ul>${plan.features.map((feature) => `<li>${icon("check")} ${feature}</li>`).join("")}</ul><button class="${featured || plan.code === "business" ? "primary-button" : "secondary-button"} plan-cta" data-plan="${plan.code}" data-route="${route}" ${current ? "disabled" : ""}>${current ? `Você já está no ${plan.name}` : plan.code === "free" ? (isAuthenticated() ? "Continuar no Free" : "Começar grátis") : `Assinar ${plan.name}`} ${icon(current ? "badge-check" : "arrow-right")}</button>${plan.code !== "free" ? `<small class="secure-note">${icon("shield-check")} Checkout seguro do gateway.</small>` : ""}</article>`; };
  return `<div class="public-page plans-page"><header class="public-header"><button class="back-public inline-back" data-route="/">${icon("arrow-left")} Voltar</button><div class="brand"><span class="brand-mark"><img src="fixflow.jpg" alt="FixFlow"></span><span>FixFlow</span></div><button class="quiet-button" data-route="/app/billing">Minha assinatura</button></header><section class="plans-hero"><p class="eyebrow">Planos FixFlow</p><h1>Escolha o ritmo da sua operação.</h1><p>Comece no Free, cresça com o Pro e dê escala à sua equipe com o Business.</p></section><section class="comparison-grid comparison-grid-three">${Object.values(PLAN_CATALOG).map(card).join("")}</section><section class="upgrade-value"><div><p class="eyebrow">Por que fazer upgrade?</p><h2>Menos operação manual. Mais tempo para fazer o que importa.</h2></div><div class="benefit-grid"><article><span>${icon("message-square-off")}</span><h3>Pare de controlar processos em vários lugares</h3><p>Centralize status, histórico e informações em um fluxo que sua equipe acompanha.</p></article><article><span>${icon("radar")}</span><h3>Mantenha todos alinhados</h3><p>Compartilhe atualizações profissionais e reduza interrupções na operação.</p></article><article><span>${icon("wand-sparkles")}</span><h3>Automatize o repetitivo</h3><p>Tenha visão financeira, relatórios e IA ampliada para decidir mais rápido.</p></article></div></section><section class="plans-faq"><p class="eyebrow">Dúvidas frequentes</p>${faqItems()}</section></div>`;
}

function faqItems() {
  const items = [["Posso cancelar quando quiser?", "Sim. O cancelamento não apaga os dados da sua empresa; a assinatura apenas deixa de renovar."], ["Meus dados são apagados se eu cancelar?", "Não. Seus dados continuam armazenados. Ao voltar para o Free, novas criações respeitam os limites do plano."], ["O pagamento é mensal?", "Sim. O Pro está configurado para cobrança mensal. A modalidade anual pode ser adicionada ao catálogo depois."], ["O que acontece se meu pagamento falhar?", "A assinatura pode entrar em PAST_DUE e, depois da tolerância, voltar ao Free sem apagar os dados."], ["Preciso cadastrar cartão para usar o Free?", "Não. O Free não exige cartão."], ["O que acontece com meus dados no downgrade?", "Nada é excluído. Dados acima do limite ficam preservados e novas criações são bloqueadas até o upgrade."]];
  return items.map(([question, answer]) => `<details><summary>${question}${icon("plus")}</summary><p>${answer}</p></details>`).join("");
}

export function bindProComparison() {
  document.querySelectorAll("[data-route]").forEach((button) => { button.onclick = () => navigate(button.dataset.route); });
  document.querySelectorAll(".plan-cta").forEach((button) => button.addEventListener("click", () => {
    if (button.disabled) return;
    const route = button.dataset.route;
    if (!isAuthenticated() && button.dataset.plan !== "free") { sessionStorage.setItem("fixflow.returnTo", route); navigate("/login"); return; }
    navigate(route);
  }));
  refreshSubscriptionState();
}

async function refreshSubscriptionState() {
  if (!isAuthenticated()) return;
  const session = JSON.parse(localStorage.getItem("fixflow.app.v1"))?.session;
  if (!session) return;
  try {
    const response = await fetch(`${API_URL}/api/billing/subscription`, { headers: { "x-user-id": session.userId, "x-workspace-id": session.workspaceId } });
    const subscription = await response.json();
    const button = document.querySelector(`.plan-cta[data-plan="${subscription.plan}"]`);
    if (button && ["active", "trialing", "past_due"].includes(subscription.status)) {
      button.disabled = true;
      button.innerHTML = `Você já está no ${subscription.plan === "business" ? "Business" : "Pro"} ${icon("badge-check")}`;
    }
  } catch { return; }
}
