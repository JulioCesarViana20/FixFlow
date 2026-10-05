import { navigate } from "../core/router.js";
import { hydrateIcons, icon } from "../components/ui.js";
import { PLAN_CATALOG, planPrice } from "../config/plans.js";

export function landingPage() {
  const pro = PLAN_CATALOG.pro;
  return `<div class="public-page"><header class="public-header"><div class="brand"><span class="brand-mark"><img src="fixflow.jpg" alt="FixFlow"></span><span>FixFlow</span></div><nav><a href="#features">Produto</a><a href="#features">Recursos</a><a href="#pricing">Preços</a><a href="#faq">FAQ</a></nav><div class="public-actions"><button class="secondary-button" data-route="/planos/pro">Conhecer Pro</button><button class="primary-button" data-route="/cadastro">Começar gratuitamente ${icon("arrow-right")}</button></div></header><section class="landing-hero public-hero landing-hero-premium"><div class="hero-depth" aria-hidden="true"><span class="depth-orbit orbit-one"></span><span class="depth-orbit orbit-two"></span><span class="depth-panel panel-one"></span><span class="depth-panel panel-two"></span><span class="depth-dot dot-one"></span><span class="depth-dot dot-two"></span><span class="depth-dot dot-three"></span></div><div class="hero-content"><p class="eyebrow">Clareza para o trabalho que move sua empresa</p><h1><span class="typing-line" data-typing-target>Organize seus processos em um só lugar.</span><span class="typing-cursor" aria-hidden="true"></span></h1><p class="hero-description">Clientes, tarefas, demandas, aprovações e pagamentos em um fluxo simples, profissional e adaptável ao seu negócio.</p><div class="heading-actions"><button class="primary-button" data-route="/cadastro">Começar gratuitamente ${icon("arrow-right")}</button><a class="secondary-button" href="#features">${icon("play")} Ver como funciona</a></div><div class="public-proof"><span>${icon("check-circle-2")} Sem cartão de crédito</span><span>${icon("check-circle-2")} Comece em poucos minutos</span><span>${icon("check-circle-2")} Feito para sua operação</span></div></div></section><section class="landing-section" id="features"><p class="eyebrow">Tudo conectado</p><h2>Menos ruído. Mais fluxo.</h2><p>O FixFlow organiza o trabalho da sua empresa, do primeiro contato à conclusão.</p><div class="feature-grid"><div class="feature">${icon("workflow")}<h3>Processos sob controle</h3><p>Estruture demandas, responsáveis, prioridades e cada mudança de status.</p></div><div class="feature">${icon("send")}<h3>Relacionamentos mais claros</h3><p>Compartilhe atualizações profissionais e mantenha clientes e equipes alinhados.</p></div><div class="feature">${icon("wallet-cards")}<h3>Financeiro conectado</h3><p>Saiba o que está pendente, recebido e atrasado em uma única visão.</p></div></div></section><section class="landing-section flow-section"><p class="eyebrow">Como funciona</p><h2>Da demanda concluída ao próximo passo.</h2><div class="flow-grid">${["Cadastre uma demanda", "Defina responsáveis", "Organize as etapas", "Acompanhe o andamento", "Compartilhe atualizações", "Registre a conclusão"].map((item, index) => `<div class="flow-step"><b>0${index + 1}</b><span>${item}</span></div>`).join("")}</div></section><section class="landing-section" id="pricing"><p class="eyebrow">Planos simples</p><h2>Comece no seu ritmo.</h2><div class="pricing-grid"><div class="price-card"><p class="eyebrow">FREE</p><h3>Gratuito</h3><p>Para começar a organizar sua operação.</p><button class="secondary-button" data-route="/cadastro">Começar grátis</button></div><div class="price-card featured"><p class="eyebrow">PRO</p><h3>${planPrice(pro)} <small>/mês</small></h3><p>Para empresas que querem crescer com mais controle.</p><button class="primary-button" data-route="/planos/pro">Conhecer Pro</button></div></div></section><section class="landing-section faq-section" id="faq"><p class="eyebrow">Perguntas frequentes</p><h2>Tudo claro antes de começar.</h2>${["O que é o FixFlow?", "Preciso instalar alguma coisa?", "Posso testar gratuitamente?", "Minha equipe precisa criar uma conta?", "Como funciona o acompanhamento dos fluxos?", "Como funcionam os planos?"].map((question) => `<details><summary>${question}${icon("plus")}</summary><p>O FixFlow é uma plataforma online para organizar processos, demandas e responsabilidades da sua empresa. Você pode começar gratuitamente e evoluir conforme sua operação cresce.</p></details>`).join("")}</section><footer class="public-footer"><div class="brand"><span class="brand-mark"><img src="fixflow.jpg" alt="FixFlow"></span><span>FixFlow</span></div><span>Gestão que acompanha seu trabalho.</span><a href="mailto:fixflowconsult@gmail.com">Fale conosco: fixflowconsult@gmail.com</a></footer></div>`;
}

export function bindLanding() {
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
  startHeroTyping();
  bindHeroParallax();
  hydrateIcons();
}

function startHeroTyping() {
  const target = document.querySelector("[data-typing-target]");
  if (!target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const phrases = [
    "Organize seus processos em um só lugar.",
    "Tenha sua empresa sob controle.",
    "Transforme tarefas em resultados.",
    "Gerencie clientes, demandas e financeiro.",
  ];
  let phraseIndex = 0;
  let characterIndex = 0;
  let deleting = false;
  const tick = () => {
    if (!target.isConnected) return;
    const phrase = phrases[phraseIndex];
    characterIndex += deleting ? -1 : 1;
    target.textContent = phrase.slice(0, characterIndex);
    let delay = deleting ? 34 : 62;
    if (!deleting && characterIndex === phrase.length) {
      deleting = true;
      delay = 2200;
    } else if (deleting && characterIndex === 0) {
      deleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      delay = 420;
    }
    window.setTimeout(tick, delay);
  };
  window.setTimeout(tick, 900);
}

function bindHeroParallax() {
  const hero = document.querySelector(".landing-hero-premium");
  if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    hero.style.setProperty("--pointer-x", `${50 + x * 2}%`);
    hero.style.setProperty("--pointer-y", `${42 + y * 2}%`);
    hero.style.setProperty("--parallax-x", `${x * 5}px`);
    hero.style.setProperty("--parallax-y", `${y * 4}px`);
  }, { passive: true });
}
