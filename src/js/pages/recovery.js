import { navigate } from "../core/router.js";
import { requestPasswordReset, resetPassword } from "../core/store.js";
import { hydrateIcons, icon } from "../components/ui.js";
import { validateEmail } from "../utils/validation.js";

export function recoveryPage() {
  return `<div class="auth-page"><button class="back-public" data-route="/login">${icon("arrow-left")} Voltar para o login</button><div class="auth-card"><div class="brand auth-brand"><span class="brand-mark"><img src="fixflow.jpg" alt="FixFlow"></span><span>FixFlow</span></div><p class="eyebrow">Recuperar acesso</p><h1>Esqueceu sua senha?</h1><p class="auth-subtitle">Digite o email da sua conta para receber as instruções de recuperação.</p><form id="recovery-form"><label>Email<input name="email" type="email" required autocomplete="email" placeholder="voce@empresa.com"></label><button class="primary-button" type="submit">Enviar instruções ${icon("send")}</button></form><p class="auth-switch">Lembrou a senha? <button data-route="/login">Voltar para o login</button></p></div></div>`;
}

export function bindRecovery() {
  document.querySelector(".back-public").onclick = () => navigate("/login");
  document.querySelector(".auth-switch [data-route]").onclick = () => navigate("/login");
  bindRequestForm();
  hydrateIcons();
}

function bindRequestForm() {
  const form = document.querySelector("#recovery-form");
  form.onsubmit = async (event) => {
    event.preventDefault();
    const emailValidation = validateEmail(new FormData(form).get("email"));
    if (!emailValidation.valid) return showFormMessage(emailValidation.message, true);

    const token = requestPasswordReset(emailValidation.value);
    showResetForm(token);
  };
}

function showResetForm(token) {
  const form = document.querySelector("#recovery-form");
  if (!token) {
    showFormMessage("Se existir uma conta com esse email, as instruções foram enviadas.");
    return;
  }

  form.innerHTML = `<p class="recovery-note">Ambiente local: o email foi confirmado para teste. Em produção, este formulário será acessado pelo link enviado ao email.</p><label>Nova senha<input name="password" type="password" minlength="8" required autocomplete="new-password" placeholder="Mínimo de 8 caracteres"></label><label>Confirme a nova senha<input name="confirmation" type="password" minlength="8" required autocomplete="new-password" placeholder="Repita sua senha"></label><button class="primary-button" type="submit">Redefinir senha ${icon("check")}</button>`;
  form.dataset.token = token;
  form.onsubmit = async (event) => {
    event.preventDefault();
    const values = new FormData(form);
    if (values.get("password") !== values.get("confirmation")) {
      showFormMessage("As senhas não coincidem.", true);
      return;
    }
    if (!(await resetPassword(form.dataset.token, String(values.get("password"))))) {
      showFormMessage("Esse link expirou ou já foi utilizado.", true);
      return;
    }
    form.innerHTML = `<p class="form-success">Senha redefinida com sucesso.</p><button class="primary-button" type="button" id="go-login">Entrar novamente ${icon("arrow-right")}</button>`;
    form.querySelector("#go-login").onclick = () => navigate("/login");
    hydrateIcons();
  };
  hydrateIcons();
}

function showFormMessage(message, error = false) {
  const form = document.querySelector("#recovery-form");
  let node = form.querySelector(".form-error, .form-success");
  if (!node) {
    node = document.createElement("p");
    form.prepend(node);
  }
  node.className = error ? "form-error" : "form-success";
  node.textContent = message;
}
