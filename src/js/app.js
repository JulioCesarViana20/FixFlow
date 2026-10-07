import { currentPath, navigate, registerRoute, startRouter } from "./core/router.js";
import { applyTheme, isAuthenticated, resetDevelopmentPlan, setDevelopmentPlan, setDevelopmentSubscription } from "./core/store.js";
import { SUBSCRIPTION_STATUSES } from "./config/plans.js";
import { mountShell } from "./components/shell.js?v=ai1";
import { hydrateIcons } from "./components/ui.js";
import { landingPage, bindLanding } from "./pages/landing.js?v=faq3";
import { authPage, bindAuth } from "./pages/auth.js";
import { recoveryPage, bindRecovery } from "./pages/recovery.js";
import { onboardingPage, bindOnboarding } from "./pages/onboarding.js";
import { dashboardPage, bindDashboard } from "./pages/dashboard.js?v=period1";
import { ordersPage, bindOrderCards } from "./pages/orders.js";
import { clientsPage, bindClients } from "./pages/clients.js";
import { financePage, bindFinance } from "./pages/finance.js";
import { reportsPage, bindReports } from "./pages/reports.js";
import { historyPage, bindHistory } from "./pages/history.js";
import { clientAreaPage } from "./pages/client-area.js";
import { placeholderPage, comingSoonPage } from "./pages/placeholder.js?v=ai1";
import { billingPage, bindBilling } from "./pages/billing.js";
import { proComparisonPage, bindProComparison } from "./pages/pro-comparison.js";
import { checkoutPage, bindCheckout, checkoutStatePage, bindCheckoutState } from "./pages/checkout.js";
import { privacyPage, termsPage, bindLegal } from "./pages/legal.js";
import { settingsPage, bindSettings } from "./pages/settings.js";

if (typeof window === "undefined" || typeof document === "undefined") {
  console.warn("FixFlow app skipped: browser runtime not available.");
} else {
  const app = document.querySelector("#app");

  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    window.fixflowDevPlans = {
      set(planCode) {
        setDevelopmentPlan(planCode);
        window.location.reload();
      },
      reset() {
        resetDevelopmentPlan();
        window.location.reload();
      },
      setSubscription(status, planCode = "pro", periodEnd = "") {
        setDevelopmentSubscription(planCode, status, periodEnd);
        window.location.reload();
      },
      statuses: SUBSCRIPTION_STATUSES,
    };
  }

  // Cada rota decide sua tela e seus eventos; o shell continua compartilhado.
  registerRoute("/", () => renderPublic(landingPage(), bindLanding));
  registerRoute("/privacidade", () => renderPublic(privacyPage(), bindLegal));
  registerRoute("/termos", () => renderPublic(termsPage(), bindLegal));
  registerRoute("/planos/pro", () => renderPublic(proComparisonPage(), bindProComparison));
  registerRoute("/login", () => renderPublic(authPage("login"), () => bindAuth("login")));
  registerRoute("/cadastro", () => renderPublic(authPage("signup"), () => bindAuth("signup")));
  registerRoute("/recuperar-senha", () => renderPublic(recoveryPage(), bindRecovery));
  registerRoute("/onboarding", () => renderPrivate(onboardingPage(), bindOnboarding, false));
  registerRoute("/app/dashboard", () => renderPrivate(dashboardPage(), bindDashboard));
  registerRoute("/app/orders", () => renderPrivate(ordersPage(), bindOrderCards));
  registerRoute("/app/clients", () => renderPrivate(clientsPage(), bindClients));
  registerRoute("/app/client", () => renderPrivate(clientAreaPage()));
  registerRoute("/app/billing", () => renderPrivate(billingPage(), bindBilling));
  registerRoute("/checkout/pro", () => renderPublic(checkoutPage("pro"), () => bindCheckout("pro")));
  registerRoute("/checkout/business", () => renderPublic(checkoutPage("business"), () => bindCheckout("business")));
  registerRoute("/checkout/sucesso", () => renderPublic(checkoutStatePage("success"), () => bindCheckoutState("success")));
  registerRoute("/checkout/pendente", () => renderPublic(checkoutStatePage("pending"), () => bindCheckoutState("pending")));
  registerRoute("/checkout/falhou", () => renderPublic(checkoutStatePage("failed"), () => bindCheckoutState("failed")));
  registerRoute("/app/history", () => renderPrivate(historyPage(), bindHistory));
  registerRoute("/app/finance", () => renderPrivate(financePage(), bindFinance));
  registerRoute("/app/reports", () => renderPrivate(reportsPage(), bindReports));
  registerRoute("/app/settings", () => renderPrivate(settingsPage(), bindSettings));
  registerRoute("/app/ai", () => renderPrivate(comingSoonPage("Flow IA", "Uma nova forma de pensar junto com os dados do seu workspace.")));
  registerRoute("/404", () => renderPublic(placeholderPage("Página não encontrada", "O endereço acessado não existe.")));

  function renderPublic(content, bind) {
    applyTheme();
    document.body.classList.add("public-mode");
    setPageTitle(currentPath());
    document.querySelector(".sidebar").style.display = "none";
    document.querySelector(".topbar").style.display = "none";
    app.innerHTML = content;
    hydrateIcons();
    bind?.();
  }

  function renderPrivate(content, bind, requireWorkspace = true) {
    applyTheme();
    if (!requireWorkspace) {
      renderPublic(content, bind);
      return;
    }
    if (requireWorkspace && !isAuthenticated()) {
      navigate("/login", true);
      return;
    }
    mountShell(currentPath().replace("/app/", ""));
    setPageTitle(currentPath());
    app.innerHTML = content;
    hydrateIcons();
    bind?.();
  }

  function setPageTitle(path) {
    const titles = {
      "/": "Organize suas ideias em um só lugar",
      "/login": "Entrar",
      "/cadastro": "Criar conta",
      "/privacidade": "Política de Privacidade",
      "/termos": "Termos de Uso",
      "/app/dashboard": "Dashboard",
      "/app/orders": "Demandas",
      "/app/clients": "Clientes",
      "/app/finance": "Financeiro",
      "/app/billing": "Assinatura e cobrança",
      "/app/history": "Histórico",
      "/app/reports": "Relatórios",
      "/app/settings": "Configurações",
      "/app/client": "Área do cliente",
    };
    const label = titles[path] || "FixFlow";
    document.title = path.startsWith("/app/") ? `FixFlow — ${label}` : `FixFlow — ${label}`;
  }

  startRouter();
}
