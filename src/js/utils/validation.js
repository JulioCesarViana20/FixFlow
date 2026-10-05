const disposableEmailDomains = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "invalid.com",
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "10minutemail.com",
]);

const brazilianAreaCodes = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "22", "24",
  "27", "28", "31", "32", "33", "34", "35", "37", "38", "41", "42", "43",
  "44", "45", "46", "47", "48", "49", "51", "53", "54", "55", "61", "62",
  "63", "64", "65", "66", "67", "68", "69", "71", "73", "74", "75", "77",
  "79", "81", "82", "83", "84", "85", "86", "87", "88", "89", "91", "92",
  "93", "94", "95", "96", "97", "98", "99",
]);

export function validateEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  const [local, domain, extra] = email.split("@");

  if (
    extra ||
    !local ||
    !domain ||
    email.length > 254 ||
    local.length > 64 ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..") ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local) ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain) ||
    disposableEmailDomains.has(domain)
  ) {
    return { valid: false, message: "Digite um email válido de uma empresa ou provedor real." };
  }

  return { valid: true, value: email };
}

export function validateBrazilianPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const areaCode = digits.slice(0, 2);
  const localNumber = digits.slice(2);
  const repeated = /^(\d)\1+$/.test(localNumber);
  const isMobile = digits.length === 11 && localNumber.startsWith("9");
  const isLandline = digits.length === 10 && /^[2-5]/.test(localNumber);

  if (
    !brazilianAreaCodes.has(areaCode) ||
    (!isMobile && !isLandline) ||
    repeated
  ) {
    return { valid: false, message: "Digite um telefone brasileiro válido com DDD." };
  }

  return { valid: true, value: digits };
}

export const PHONE_COUNTRIES = Object.freeze([
  ["BR", "Brasil", "+55"], ["US", "Estados Unidos", "+1"], ["GB", "Reino Unido", "+44"],
  ["CH", "Suíça", "+41"], ["CA", "Canadá", "+1"], ["AU", "Austrália", "+61"],
  ["DE", "Alemanha", "+49"], ["FR", "França", "+33"], ["PT", "Portugal", "+351"],
]);

export function validateInternationalPhone(value, country = "BR") {
  const raw = String(value || "").trim();
  const parser = globalThis.libphonenumber?.parsePhoneNumberFromString;
  const parsed = parser ? parser(raw, country) : null;
  if (parsed) {
    if (!parsed.isValid()) return { valid: false, message: "Digite um telefone válido para o país selecionado." };
    return { valid: true, value: parsed.number, formatted: parsed.formatInternational() };
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return { valid: false, message: "Digite um telefone internacional válido." };
  return { valid: true, value: `+${digits}`, formatted: `+${digits}` };
}

export function formatInternationalPhone(value, country = "BR") {
  const parser = globalThis.libphonenumber?.parsePhoneNumberFromString;
  const parsed = parser ? parser(String(value || ""), country) : null;
  return parsed ? parsed.formatInternational() : String(value || "").replace(/[^\d+ ]/g, "");
}

export function formatBrazilianPhone(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCpf(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCnpj(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatBrazilianZipCode(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  return digits.length <= 5 ? digits : `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function validateCpf(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return { valid: false, message: "CPF inválido." };
  for (let factor = 9; factor <= 10; factor += 1) {
    const sum = digits.slice(0, factor).split("").reduce((total, digit, index) => total + Number(digit) * (factor + 1 - index), 0);
    const check = (sum * 10) % 11 % 10;
    if (check !== Number(digits[factor])) return { valid: false, message: "CPF inválido." };
  }
  return { valid: true, value: digits };
}

export function validateCnpj(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return { valid: false, message: "CNPJ inválido." };
  const calculate = (length) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = digits.slice(0, length).split("").reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  if (calculate(12) !== Number(digits[12]) || calculate(13) !== Number(digits[13])) return { valid: false, message: "CNPJ inválido." };
  return { valid: true, value: digits };
}

export function todayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
