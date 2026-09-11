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

export function formatBrazilianPhone(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
