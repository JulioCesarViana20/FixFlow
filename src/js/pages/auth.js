import { createAccount, getState, hydrateRemoteWorkspace, signIn } from "../core/store.js";
import { navigate } from "../core/router.js";
import { hydrateIcons, icon } from "../components/ui.js";
import { validateEmail } from "../utils/validation.js";
import { API_URL } from "../config/api.js";

export function authPage(type) {
  const signup = type === "signup";
  return `<div class="auth-page"><button class="back-public" data-route="/">${icon("arrow-left")} Voltar ao FixFlow</button><div class="auth-card"><div class="brand auth-brand"><span class="brand-mark"><img src="fixflow.jpg" alt="FixFlow"></span><span>FixFlow</span></div><p class="eyebrow">${signup ? "Comece agora" : "Bem-vindo de volta"}</p><h1>${signup ? "Crie sua conta" : "Entrar no FixFlow"}</h1><p class="auth-subtitle">${signup ? "Organize a operação da sua empresa com mais clareza." : "Acesse o workspace da sua empresa."}</p><form id="auth-form"><label>Email<input name="email" type="email" required autocomplete="email" placeholder="voce@empresa.com"></label><label>Senha<input name="password" type="password" minlength="8" required autocomplete="${signup ? "new-password" : "current-password"}" placeholder="Mínimo de 8 caracteres"></label>${signup ? '<label>Nome do responsável<input name="name" required autocomplete="name" placeholder="Seu nome"></label><label>Confirme sua senha<input name="confirmation" type="password" minlength="8" required autocomplete="new-password" placeholder="Repita sua senha"></label><label class="legal-consent"><input name="legalAcceptance" type="checkbox" required> <span>Li e concordo com a <a href="#/privacidade" target="_blank" rel="noopener">Política de Privacidade</a> e os <a href="#/termos" target="_blank" rel="noopener">Termos de Uso</a> do FixFlow.</span></label>' : ""}<button class="primary-button" type="submit" ${signup ? "disabled" : ""}>${signup ? "Criar minha conta" : "Entrar"} ${icon("arrow-right")}</button></form>${!signup ? '<button class="forgot-password" data-route="/recuperar-senha">Esqueci minha senha</button>' : ""}<p class="auth-switch">${signup ? "Já possui uma conta?" : "Ainda não possui conta?"} <button data-route="/${signup ? "login" : "cadastro"}">${signup ? "Entrar" : "Criar conta grátis"}</button></p></div></div>`;
}

export function bindAuth(type) {
  document.querySelector("[data-route]").onclick = () => navigate("/");
  document.querySelectorAll(".auth-switch [data-route]").forEach((button) => {
    button.onclick = () => navigate(button.dataset.route);
  });
  document.querySelector(".forgot-password")?.addEventListener("click", (event) => navigate(event.currentTarget.dataset.route));
  document.querySelectorAll(".legal-consent a").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.open(link.href, "_blank", "noopener,noreferrer");
    });
  });
  const consent = document.querySelector("[name=legalAcceptance]");
  const submit = document.querySelector("#auth-form button[type=submit]");
  submit.dataset.defaultLabel = submit.innerHTML;
  consent?.addEventListener("change", () => { submit.disabled = !consent.checked; });
  document.querySelector("#auth-form").onsubmit = async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    submit.disabled = true;
    submit.textContent = "Processando...";
    const form = new FormData(event.currentTarget);
    const emailValidation = validateEmail(form.get("email"));
    const password = String(form.get("password"));

    if (!emailValidation.valid) return showFormError(emailValidation.message);
    const email = emailValidation.value;

    if (type === "signup") {
      if (password !== form.get("confirmation")) return showFormError("As senhas não coincidem.");
      if (!form.get("legalAcceptance")) return showFormError("Para criar sua conta, você precisa ler e aceitar a Política de Privacidade e os Termos de Uso.");
      if (getState().users.some((user) => user.email === email)) return showFormError("Não foi possível concluir o cadastro. Verifique os dados.");
      registerAccount({ name: form.get("name"), email, password }).then(async (account) => {
        await createAccount({ name: form.get("name"), email, password, userId: account.userId, workspaceId: account.workspaceId, accessToken: account.accessToken });
        const returnTo = sessionStorage.getItem("fixflow.returnTo") || "/onboarding";
        sessionStorage.removeItem("fixflow.returnTo");
        navigate(returnTo);
      }).catch((error) => showFormError(error.message === "EMAIL_ALREADY_REGISTERED" ? "Não foi possível concluir o cadastro. Verifique os dados." : error.message === "LEGAL_ACCEPTANCE_REQUIRED" ? "Aceite as versões atuais da Política de Privacidade e dos Termos de Uso para continuar." : error.message === "AUTH_API_UNAVAILABLE" ? "O serviço de cadastro está offline. Inicie a API com npm run dev:api e tente novamente." : "Não foi possível concluir o cadastro agora."));
      return;
    }

    let account;
    try { account = await loginAccount({ email, password }); }
    catch (error) { return showFormError(error.message === "AUTH_API_UNAVAILABLE" ? "O serviço de login está offline. Inicie a API e tente novamente." : "Não foi possível entrar. Verifique os dados informados."); }
    if (!(await signIn(email, password, account))) return showFormError("Não foi possível entrar. Verifique os dados informados.");
    void hydrateRemoteWorkspace();
    const returnTo = sessionStorage.getItem("fixflow.returnTo") || "/app/dashboard";
    sessionStorage.removeItem("fixflow.returnTo");
    navigate(returnTo);
  };
  hydrateIcons();
}

async function loginAccount({ email, password }) {
  let response;
  try { response = await fetch(`${API_URL}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }); }
  catch { throw new Error("AUTH_API_UNAVAILABLE"); }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "INVALID_CREDENTIALS");
  return result;
}

async function registerAccount({ name, email, password }) {
  let response;
  try {
    response = await fetch(`${API_URL}/api/auth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, password, acceptance: { privacyPolicy: { accepted: true, version: "1.0" }, termsOfUse: { accepted: true, version: "1.0" } } }) });
  } catch {
    throw new Error("AUTH_API_UNAVAILABLE");
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "REGISTRATION_FAILED");
  return result;
}

function showFormError(message) {
  const form = document.querySelector("#auth-form");
  const submit = form.querySelector("button[type=submit]");
  submit.disabled = false;
  submit.innerHTML = submit.dataset.defaultLabel || "Continuar";
  let error = form.querySelector(".form-error");
  if (!error) {
    error = document.createElement("p");
    error.className = "form-error";
    form.prepend(error);
  }
  error.textContent = message;
}
