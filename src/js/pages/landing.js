import { navigate } from "../core/router.js";
import { hydrateIcons, icon } from "../components/ui.js";
import { PLAN_CATALOG, planPrice } from "../config/plans.js";

let landingIntroShown = false;

export function landingPage() {
  const pro = PLAN_CATALOG.pro;
  const intro = landingIntroShown ? "" : `<div class="landing-entry" aria-label="Abertura FixFlow">
    <div class="landing-entry-halo" aria-hidden="true"></div>
    <div class="landing-entry-content">
      <div class="landing-entry-symbol" aria-hidden="true">
        <svg viewBox="0 0 120 120" role="presentation">
          <path d="M27 38.5c1.5-5.8 6.5-10 12.5-10h50.8L76.4 48.8l-40.6 4.8c-6.2.7-10.4-5.1-8.8-11.1Z"></path>
          <path d="m25.2 61.5 42.2-5 16.8 1.1-12.9 16.2-30.7 3.8-4.3 21.2c-.9 4.5-6.4 6.5-9.9 3.6l-8.7-7.1c-2.1-1.7-3-4.5-2.4-7.2l9.9-26.6Z"></path>
        </svg>
      </div>
      <div class="landing-entry-wordmark" aria-label="FixFlow">
        <span>Fix</span><span class="landing-entry-wordmark-accent">Flow</span>
      </div>
      <span class="landing-entry-rule" aria-hidden="true"></span>
    </div>
  </div>`;
  landingIntroShown = true;
  return `${intro}<div class="public-page"><header class="public-header"><div class="brand"><span class="brand-mark"><img src="fixflow.jpg" alt="FixFlow"></span><span>FixFlow</span></div><nav><a href="#features">Produto</a><a href="#features">Recursos</a><a href="#pricing">Preços</a><a href="#faq">FAQ</a></nav><div class="public-actions"><button class="secondary-button" data-route="/planos/pro">Conhecer Pro</button><button class="primary-button" data-route="/cadastro">Começar gratuitamente ${icon("arrow-right")}</button></div></header><section class="landing-hero public-hero"><p class="eyebrow">Clareza para o trabalho que move sua empresa</p><h1>Organize seus processos <span>em um só lugar.</span></h1><p>Clientes, tarefas, demandas, aprovações e pagamentos em um fluxo simples, profissional e adaptável ao seu negócio.</p><div class="heading-actions"><button class="primary-button" data-route="/cadastro">Começar gratuitamente ${icon("arrow-right")}</button><a class="secondary-button" href="#features">${icon("play")} Ver como funciona</a></div><div class="public-proof"><span>${icon("check-circle-2")} Sem cartão de crédito</span><span>${icon("check-circle-2")} Comece em poucos minutos</span><span>${icon("check-circle-2")} Feito para sua operação</span></div></section><section class="landing-section" id="features"><p class="eyebrow">Tudo conectado</p><h2>Menos ruído. Mais fluxo.</h2><p>O FixFlow organiza o trabalho da sua empresa, do primeiro contato à conclusão.</p><div class="feature-grid"><div class="feature">${icon("workflow")}<h3>Processos sob controle</h3><p>Estruture demandas, responsáveis, prioridades e cada mudança de status.</p></div><div class="feature">${icon("send")}<h3>Relacionamentos mais claros</h3><p>Compartilhe atualizações e mantenha clientes e equipes alinhados.</p></div><div class="feature">${icon("wallet-cards")}<h3>Financeiro conectado</h3><p>Saiba o que está pendente, recebido e atrasado em uma única visão.</p></div></div></section><section class="landing-section flow-section"><p class="eyebrow">Como funciona</p><h2>Da demanda concluída ao próximo passo.</h2><div class="flow-grid">${["Cadastre uma demanda", "Defina responsáveis", "Organize as etapas", "Acompanhe o andamento", "Compartilhe atualizações", "Registre a conclusão"].map((item, index) => `<div class="flow-step"><b>0${index + 1}</b><span>${item}</span></div>`).join("")}</div></section><section class="landing-section" id="pricing"><p class="eyebrow">Planos simples</p><h2>Comece no seu ritmo.</h2><div class="pricing-grid"><div class="price-card"><p class="eyebrow">FREE</p><h3>Gratuito</h3><p>Para começar a organizar sua operação.</p><button class="secondary-button" data-route="/cadastro">Começar grátis</button></div><div class="price-card featured"><p class="eyebrow">PRO</p><h3>${planPrice(pro)} <small>/mês</small></h3><p>Para empresas que querem crescer com mais controle.</p><button class="primary-button" data-route="/planos/pro">Conhecer Pro</button></div></div></section><section class="landing-section faq-section" id="faq"><p class="eyebrow">Perguntas frequentes</p><h2>Tudo claro antes de começar.</h2>${["O que é o FixFlow?", "Preciso instalar alguma coisa?", "Posso testar gratuitamente?", "Minha equipe precisa criar uma conta?", "Como funciona o acompanhamento dos fluxos?", "Como funcionam os planos?"].map((question) => `<details><summary>${question}${icon("plus")}</summary><p>O FixFlow é uma plataforma online para organizar processos, demandas e responsabilidades da sua empresa. Você pode começar gratuitamente e evoluir conforme sua operação cresce.</p></details>`).join("")}</section><footer class="public-footer"><div class="brand"><span class="brand-mark"><img src="fixflow.jpg" alt="FixFlow"></span><span>FixFlow</span></div><span>Gestão que acompanha seu trabalho.</span><a href="mailto:fixflowconsult@gmail.com">Fale conosco: fixflowconsult@gmail.com</a></footer></div>`;
}

export function bindLanding() {
  if (document.querySelector(".landing-entry")) window.setTimeout(() => document.querySelector(".landing-entry")?.remove(), 3000);
  const hero = document.querySelector(".public-hero");
  document.querySelectorAll("[data-route]").forEach((button) => { button.onclick = () => navigate(button.dataset.route); });
  const pricingGrid = document.querySelector(".pricing-grid");
  const business = PLAN_CATALOG.business;
  if (pricingGrid && !pricingGrid.querySelector('[data-plan="business"]')) {
    pricingGrid.insertAdjacentHTML("beforeend", `<div class="price-card business-card"><p class="eyebrow">BUSINESS</p><h3>${planPrice(business)} <small>/mês</small></h3><p>${business.description}</p><button class="primary-button" data-route="/planos/pro">Conhecer Business ${icon("arrow-right")}</button></div>`);
    pricingGrid.querySelector('[data-plan="business"]')?.addEventListener("click", () => navigate("/checkout/business"));
    const businessButton = pricingGrid.lastElementChild.querySelector("[data-route]");
    businessButton.onclick = () => navigate("/checkout/business");
  }
  document.querySelectorAll('a[href^="#"]').forEach((link) => { link.onclick = (event) => { event.preventDefault(); document.querySelector(link.getAttribute("href"))?.scrollIntoView({ behavior: "smooth" }); }; });
  if (hero && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let frame;
    hero.addEventListener("pointermove", (event) => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { const bounds = hero.getBoundingClientRect(); hero.style.setProperty("--pointer-x", `${Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100))}%`); hero.style.setProperty("--pointer-y", `${Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100))}%`); }); }, { passive: true });
    hero.addEventListener("pointerleave", () => { hero.style.setProperty("--pointer-x", "50%"); hero.style.setProperty("--pointer-y", "42%"); });
  }
  hydrateIcons();
}
