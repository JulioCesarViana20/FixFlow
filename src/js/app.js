import { currentPath, navigate, registerRoute, startRouter } from "./core/router.js";
import { getWorkspace, isAuthenticated } from "./core/store.js";
import { mountShell } from "./components/shell.js";
import { hydrateIcons } from "./components/ui.js";
import { landingPage, bindLanding } from "./pages/landing.js";
import { authPage, bindAuth } from "./pages/auth.js";
import { recoveryPage, bindRecovery } from "./pages/recovery.js";
import { onboardingPage, bindOnboarding } from "./pages/onboarding.js";
import { dashboardPage } from "./pages/dashboard.js";
import { ordersPage, bindOrderCards } from "./pages/orders.js";
import { placeholderPage } from "./pages/placeholder.js";
import { billingPage, bindBilling } from "./pages/billing.js";
import { proComparisonPage, bindProComparison } from "./pages/pro-comparison.js";
import { checkoutPage, bindCheckout, checkoutStatePage, bindCheckoutState } from "./pages/checkout.js";
import { privacyPage, termsPage, bindLegal } from "./pages/legal.js";
import { settingsPage, bindSettings } from "./pages/settings.js";

const app = document.querySelector("#app");

// Cada rota decide sua tela e seus eventos; o shell continua compartilhado.
registerRoute("/", () => renderPublic(landingPage(), bindLanding));
registerRoute("/privacidade", () => renderPublic(privacyPage(), bindLegal));
registerRoute("/termos", () => renderPublic(termsPage(), bindLegal));
registerRoute("/planos/pro", () => renderPublic(proComparisonPage(), bindProComparison));
registerRoute("/login", () => renderPublic(authPage("login"), () => bindAuth("login")));
registerRoute("/cadastro", () => renderPublic(authPage("signup"), () => bindAuth("signup")));
registerRoute("/recuperar-senha", () => renderPublic(recoveryPage(), bindRecovery));
registerRoute("/onboarding", () => renderPrivate(onboardingPage(), bindOnboarding, false));
registerRoute("/app/dashboard", () => renderPrivate(dashboardPage()));
registerRoute("/app/orders", () => renderPrivate(ordersPage(), bindOrderCards));
registerRoute("/app/clients", () => renderPrivate(placeholderPage("Clientes", "Cadastre e acompanhe seus clientes.")));
registerRoute("/app/client", () => renderPrivate(placeholderPage("Área do cliente", "Compartilhe atualizações do serviço com seus clientes.")));
registerRoute("/app/billing", () => renderPrivate(billingPage(), bindBilling));
registerRoute("/checkout/pro", () => renderPublic(checkoutPage("pro"), () => bindCheckout("pro")));
registerRoute("/checkout/business", () => renderPublic(checkoutPage("business"), () => bindCheckout("business")));
registerRoute("/checkout/sucesso", () => renderPublic(checkoutStatePage("success"), () => bindCheckoutState("success")));
registerRoute("/checkout/pendente", () => renderPublic(checkoutStatePage("pending"), () => bindCheckoutState("pending")));
registerRoute("/checkout/falhou", () => renderPublic(checkoutStatePage("failed"), () => bindCheckoutState("failed")));
registerRoute("/app/history", () => renderPrivate(placeholderPage("Histórico", "Consulte as atividades do seu workspace.")));
registerRoute("/app/settings", () => renderPrivate(settingsPage(), bindSettings));
registerRoute("/404", () => renderPublic(placeholderPage("Página não encontrada", "O endereço acessado não existe.")));

function renderPublic(content, bind) {
  document.body.classList.add("public-mode");
  document.querySelector(".sidebar").style.display = "none";
  document.querySelector(".topbar").style.display = "none";
  app.innerHTML = content;
  hydrateIcons();
  bind?.();
}

function renderPrivate(content, bind, requireWorkspace = true) {
  if (!requireWorkspace) {
    renderPublic(content, bind);
    return;
  }
  if (requireWorkspace && !isAuthenticated()) {
    navigate("/login", true);
    return;
  }
  mountShell(currentPath().replace("/app/", ""));
  app.innerHTML = content;
  hydrateIcons();
  bind?.();
}

startRouter();
