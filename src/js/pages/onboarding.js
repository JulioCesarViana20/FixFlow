import { updateWorkspace } from "../core/store.js";
import { navigate } from "../core/router.js";
import { hydrateIcons, icon } from "../components/ui.js";
import { formatBrazilianPhone, validateBrazilianPhone } from "../utils/validation.js";

export function onboardingPage() {
  return `<div class="auth-page"><div class="auth-card onboarding-card"><div class="brand auth-brand"><span class="brand-mark"><img src="fixflow.jpg" alt="FixFlow"></span><span>FixFlow</span></div><p class="eyebrow">Primeiro acesso</p><h1>Vamos configurar sua empresa.</h1><p class="auth-subtitle">Esses dados personalizam seu workspace. Você poderá alterar tudo depois.</p><form id="onboarding-form"><label>Nome da empresa<input name="company" required minlength="2" placeholder="Nome da sua empresa"></label><label>Telefone<input name="phone" required inputmode="tel" autocomplete="tel" placeholder="(11) 99999-9999"></label><label>Tipo de negócio<select name="type"><option value="Comércio e varejo">Comércio e varejo</option><option value="Serviços profissionais">Serviços profissionais</option><option value="Tecnologia">Tecnologia</option><option value="Indústria e operações">Indústria e operações</option><option value="Construção e manutenção">Construção e manutenção</option><option value="Saúde e bem-estar">Saúde e bem-estar</option><option value="Educação">Educação</option><option value="outros">Outros</option></select></label><label class="other-business-field" hidden>Descreva seu negócio<input name="otherType" minlength="2" placeholder="Ex.: Studio de fotografia"></label><button class="primary-button" type="submit">Finalizar configuração ${icon("check")}</button></form></div></div>`;
}

export function bindOnboarding() {
  const formElement = document.querySelector("#onboarding-form");
  const phoneInput = formElement.querySelector("[name=phone]");
  const typeInput = formElement.querySelector("[name=type]");
  const otherField = formElement.querySelector(".other-business-field");
  const otherInput = formElement.querySelector("[name=otherType]");

  phoneInput.addEventListener("input", () => {
    phoneInput.value = formatBrazilianPhone(phoneInput.value);
  });
  typeInput.addEventListener("change", () => {
    const isOther = typeInput.value === "outros";
    otherField.hidden = !isOther;
    otherInput.required = isOther;
    if (!isOther) otherInput.value = "";
  });
  formElement.onsubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phoneValidation = validateBrazilianPhone(form.get("phone"));
    const type = form.get("type") === "outros" ? String(form.get("otherType") || "").trim() : form.get("type");

    if (!phoneValidation.valid) return showFormError(phoneValidation.message);
    if (type.length < 2) return showFormError("Descreva qual é o tipo do seu negócio.");
    updateWorkspace({ company: String(form.get("company")).trim(), phone: phoneValidation.value, type });
    navigate("/app/dashboard");
  };
  hydrateIcons();
}

function showFormError(message) {
  const form = document.querySelector("#onboarding-form");
  let error = form.querySelector(".form-error");
  if (!error) {
    error = document.createElement("p");
    error.className = "form-error";
    form.prepend(error);
  }
  error.textContent = message;
}
