import { assertCanCreate, getCurrentPlan } from "./plan-access.js";
import { PLAN_CODES, getPlan, SUBSCRIPTION_STATUSES } from "../config/plans.js";

const STORAGE_KEY = "fixflow.app.v1";
const emptyState = {
  users: [],
  workspaces: {},
  session: null,
};

let state = loadState();

function normalizeSubscription(workspace) {
  const planCode = getPlan(workspace.planCode || PLAN_CODES.FREE).code;
  const existing = workspace.subscription || {};
  return {
    planCode,
    status: existing.status || (planCode === PLAN_CODES.FREE ? SUBSCRIPTION_STATUSES.FREE : `ACTIVE_${planCode.toUpperCase()}`),
    billingPeriod: existing.billingPeriod || workspace.preferences.billingPeriod || "month",
    currency: existing.currency || workspace.preferences.currency || "BRL",
    currentPeriodStart: existing.currentPeriodStart || null,
    currentPeriodEnd: existing.currentPeriodEnd || null,
    nextBillingAt: existing.nextBillingAt || existing.currentPeriodEnd || null,
    autoRenew: existing.autoRenew !== false && planCode !== PLAN_CODES.FREE,
    canceledAt: existing.canceledAt || null,
    updatedAt: existing.updatedAt || null,
  };
}

function synchronizeSubscription(workspace) {
  if (!workspace?.subscription) return;
  const subscription = workspace.subscription;
  if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) <= new Date()
    && subscription.status === SUBSCRIPTION_STATUSES.CANCEL_AT_PERIOD_END) {
    subscription.status = SUBSCRIPTION_STATUSES.EXPIRED;
    subscription.planCode = PLAN_CODES.FREE;
    subscription.autoRenew = false;
    workspace.planCode = PLAN_CODES.FREE;
    subscription.nextBillingAt = null;
    subscription.updatedAt = new Date().toISOString();
    saveState();
  }
}

function loadState() {
  try {
    const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY)) || emptyState;
    Object.values(loaded.workspaces || {}).forEach((workspace) => {
      workspace.transactions ||= [];
      workspace.notifications ||= [];
      workspace.preferences = { currency: "BRL", billingPeriod: "month", dateFormat: "DD/MM/AAAA", timezone: "America/Sao_Paulo", theme: "dark", notifications: { newOrder: true, statusChange: true, dueSoon: true, completed: true, finance: true }, ...(workspace.preferences || {}) };
      workspace.clients ||= [];
      workspace.orders ||= [];
      workspace.planCode = getPlan(workspace.planCode || PLAN_CODES.FREE).code;
      workspace.subscription = normalizeSubscription(workspace);
    });
    return loaded;
  } catch {
    return emptyState;
  }
}

export function getState() {
  return state;
}

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getWorkspace() {
  const workspace = state.session ? state.workspaces[state.session.workspaceId] : null;
  synchronizeSubscription(workspace);
  return workspace;
}

export function getCurrentUser() {
  return state.session
    ? state.users.find((user) => user.id === state.session.userId) || null
    : null;
}

export async function createAccount({ name, email, password, userId, workspaceId, accessToken }) {
  const user = { id: userId || crypto.randomUUID(), name, email, passwordHash: await hashPassword(password) };
  workspaceId = workspaceId || crypto.randomUUID();

  state.users.push({ ...user, workspaceId });
  state.workspaces[workspaceId] = {
    id: workspaceId,
    company: "",
    owner: name,
    phone: "",
    type: "",
    clients: [],
    orders: [],
    transactions: [],
    activities: [],
    notifications: [],
    planCode: PLAN_CODES.FREE,
    subscription: { planCode: PLAN_CODES.FREE, status: SUBSCRIPTION_STATUSES.FREE, billingPeriod: "month", currency: "BRL", currentPeriodStart: null, currentPeriodEnd: null, nextBillingAt: null, autoRenew: false, canceledAt: null, updatedAt: new Date().toISOString() },
    preferences: { currency: "BRL", billingPeriod: "month", dateFormat: "DD/MM/AAAA", timezone: "America/Sao_Paulo", theme: "dark", notifications: { newOrder: true, statusChange: true, dueSoon: true, completed: true, finance: true } },
  };
  state.workspaces[workspaceId].notifications.push({
    id: crypto.randomUUID(),
    type: "welcome",
    message: "Bem-vindo ao FixFlow.\n\nSua conta foi criada com sucesso. A partir de agora, você pode gerenciar suas demandas, clientes e informações financeiras em um único lugar.",
    createdAt: new Date().toISOString(),
    read: false,
  });
  state.workspaces[workspaceId].notifications.push({
    id: crypto.randomUUID(),
    type: "setup",
    message: "Complete as informações do seu workspace em Configurações para personalizar sua experiência.",
    route: "/app/settings",
    createdAt: new Date().toISOString(),
    read: false,
  });
  state.session = { userId: user.id, workspaceId, accessToken: accessToken || null };
  saveState();
}

export async function signIn(email, password, remoteSession = null) {
  if (remoteSession?.userId && remoteSession?.workspaceId && remoteSession?.accessToken) {
    state.session = { userId: remoteSession.userId, workspaceId: remoteSession.workspaceId, accessToken: remoteSession.accessToken };
    saveState();
    return true;
  }
  const passwordHash = await hashPassword(password);
  const user = state.users.find(
    (item) => item.email === email && item.passwordHash === passwordHash,
  );

  const workspace = user && state.workspaces[user.workspaceId];
  if (!user || user.status === "DEACTIVATED" || user.status === "DELETED" || workspace?.status === "DEACTIVATED") return false;
  state.session = { userId: user.id, workspaceId: user.workspaceId, accessToken: state.session?.accessToken || null };
  saveState();
  return true;
}

export function getAuthHeaders(contentType = false) {
  const headers = contentType ? { "content-type": "application/json" } : {};
  if (state.session?.accessToken) headers.Authorization = `Bearer ${state.session.accessToken}`;
  return headers;
}

async function hashPassword(password) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(password)));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function requestPasswordReset(email) {
  const user = state.users.find((item) => item.email === email);
  if (!user) return null;

  const token = crypto.randomUUID();
  state.passwordReset = {
    token,
    userId: user.id,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };
  saveState();
  return token;
}

export async function resetPassword(token, password) {
  const reset = state.passwordReset;
  if (!reset || reset.token !== token || reset.expiresAt < Date.now()) return false;

  const user = state.users.find((item) => item.id === reset.userId);
  if (!user) return false;
  user.passwordHash = await hashPassword(password);
  delete state.passwordReset;
  saveState();
  return true;
}

export function signOut() {
  state.session = null;
  saveState();
}

export function deactivateLocalAccount() {
  const workspace = getWorkspace();
  const user = getCurrentUser();
  if (!workspace || !user) return false;
  workspace.status = "DEACTIVATED";
  workspace.updatedAt = new Date().toISOString();
  user.status = "DEACTIVATED";
  state.session = null;
  saveState();
  return true;
}

export async function deleteLocalAccount(confirmation, password) {
  const user = getCurrentUser();
  const workspace = getWorkspace();
  if (!user || !workspace) return false;
  if (confirmation !== "DELETE MY FIXFLOW ACCOUNT") return false;
  if (!(await verifyLocalPassword(password, user.passwordHash))) return false;
  state.users = state.users.filter((item) => item.id !== user.id);
  delete state.workspaces[workspace.id];
  state.session = null;
  saveState();
  return true;
}

async function verifyLocalPassword(password, stored) {
  return Boolean(stored) && stored === await hashPassword(password);
}

export function updateWorkspace(values) {
  Object.assign(getWorkspace(), values);
  saveState();
}

export function addActivity(text) {
  const workspace = getWorkspace();
  workspace.activities.unshift({
    id: crypto.randomUUID(),
    text,
    date: new Date().toISOString(),
  });
  saveState();
}

export function clearActivities() {
  const workspace = getWorkspace();
  if (!workspace) return false;
  workspace.activities = [];
  saveState();
  return true;
}

export function addNotification(clientId, type, message, orderId = "") {
  const workspace = getWorkspace();
  const preferenceMap = { newOrder: "newOrder", statusChange: "statusChange", completed: "completed", finance: "finance", dueDateChange: "statusChange" };
  if (workspace.preferences?.notifications?.[preferenceMap[type]] === false) return;
  workspace.notifications ||= [];
  workspace.notifications.unshift({ id: crypto.randomUUID(), clientId, orderId, type, message, createdAt: new Date().toISOString(), read: false });
  saveState();
}

export function markNotificationsRead(clientId = "") {
  (getWorkspace().notifications || []).filter((item) => !clientId || item.clientId === clientId).forEach((item) => { item.read = true; });
  saveState();
}

export function markNotificationRead(id) {
  const notification = (getWorkspace().notifications || []).find((item) => item.id === id);
  if (!notification) return false;
  notification.read = true;
  saveState();
  return true;
}

export function markAllNotificationsRead() {
  (getWorkspace().notifications || []).forEach((item) => { item.read = true; });
  saveState();
}

function workspaceCollection(name) {
  const workspace = getWorkspace();
  if (!workspace[name]) workspace[name] = [];
  return workspace[name];
}

export function addClient(values) {
  assertCanCreate(getWorkspace(), "clients");
  const email = String(values.email || "").trim().toLowerCase();
  const cpf = String(values.cpf || "").replace(/\D/g, "");
  const cnpj = String(values.cnpj || "").replace(/\D/g, "");
  if (workspaceCollection("clients").some((item) => (email && item.email === email) || (cpf && item.cpf === cpf) || (cnpj && item.cnpj === cnpj))) throw new Error("DUPLICATE_CLIENT");
  const client = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    type: values.type === "company" ? "company" : "individual",
    name: String(values.name || "").trim(),
    legalName: String(values.legalName || "").trim(),
    tradeName: String(values.tradeName || "").trim(),
    company: String(values.tradeName || values.company || "").trim(),
    cpf,
    cnpj,
    email,
    phone: String(values.phone || "").trim(),
    phoneCountry: String(values.phoneCountry || "BR").trim(),
    document: String(values.document || "").trim(),
    notes: String(values.notes || "").trim(),
  };
  workspaceCollection("clients").push(client);
  addActivity(`Cliente ${client.name} cadastrado`);
  saveState();
  return client;
}

export function updateClient(id, values) {
  const client = workspaceCollection("clients").find((item) => item.id === id);
  if (!client) return null;
  const email = String(values.email || client.email || "").trim().toLowerCase();
  const cpf = String(values.cpf || client.cpf || "").replace(/\D/g, "");
  const cnpj = String(values.cnpj || client.cnpj || "").replace(/\D/g, "");
  if (workspaceCollection("clients").some((item) => item.id !== id && ((email && item.email === email) || (cpf && item.cpf === cpf) || (cnpj && item.cnpj === cnpj)))) throw new Error("DUPLICATE_CLIENT");
  Object.assign(client, values, { email, cpf, cnpj, updatedAt: new Date().toISOString() });
  saveState();
  return client;
}

export function deleteClient(id) {
  const workspace = getWorkspace();
  const index = workspaceCollection("clients").findIndex((item) => item.id === id);
  if (index < 0) return false;
  workspace.clients.splice(index, 1);
  saveState();
  return true;
}

export function deleteClients(ids) {
  const selected = new Set(ids);
  const workspace = getWorkspace();
  const before = workspace.clients.length;
  workspace.clients = workspace.clients.filter((client) => !selected.has(client.id));
  saveState();
  return before - workspace.clients.length;
}

export function addOrder(values) {
  const workspace = getWorkspace();
  assertCanCreate(workspace, "orders");
  const normalizedTitle = String(values.title || "").trim().toLocaleLowerCase();
  const normalizedDescription = String(values.description || "").trim().toLocaleLowerCase();
  if (workspace.orders.some((item) => item.clientId === (values.clientId || "") && String(item.title || item.device || "").trim().toLocaleLowerCase() === normalizedTitle && item.dueDate === (values.dueDate || "") && String(item.description || item.problem || "").trim().toLocaleLowerCase() === normalizedDescription)) throw new Error("DUPLICATE_ORDER");
  const order = {
    id: crypto.randomUUID(),
    number: `DEM-${String(workspace.orders.length + 1).padStart(4, "0")}`,
    createdAt: new Date().toISOString(),
    title: String(values.title || "").trim(),
    description: String(values.description || "").trim(),
    clientId: values.clientId || "",
    clientName: String(values.clientName || "").trim(),
    device: String(values.title || "").trim(),
    problem: String(values.description || "").trim(),
    total: Number(values.value || 0),
    dueDate: values.dueDate || "",
    status: values.status || "PENDENTE",
    priority: values.priority || "Média",
    category: String(values.category || "").trim(),
    assignee: String(values.assignee || "").trim(),
    notes: String(values.notes || "").trim(),
  };
  if (order.dueDate && order.dueDate < new Date().toISOString().slice(0, 10)) throw new Error("DUE_DATE_IN_PAST");
  workspace.orders.push(order);
  addActivity(`Demanda ${order.number} criada`);
  if (order.clientId) addNotification(order.clientId, "newOrder", `Uma nova demanda foi criada: ${order.title}. Prazo: ${order.dueDate || "não informado"}. Status: ${order.status}.`, order.id);
  saveState();
  return order;
}

export function updateOrder(id, values) {
  const order = workspaceCollection("orders").find((item) => item.id === id);
  if (!order) return null;
  const previousStatus = order.status;
  const previousDueDate = order.dueDate;
  if (values.dueDate && values.dueDate < new Date().toISOString().slice(0, 10)) throw new Error("DUE_DATE_IN_PAST");
  Object.assign(order, values, { total: Number(values.value ?? values.total ?? order.total), updatedAt: new Date().toISOString() });
  if (order.clientId && order.status !== previousStatus) addNotification(order.clientId, order.status === "CONCLUÍDA" ? "completed" : "statusChange", `A demanda ${order.title} agora está com status: ${order.status}.`, order.id);
  if (order.clientId && order.dueDate !== previousDueDate) addNotification(order.clientId, "dueDateChange", `O prazo da demanda ${order.title} foi atualizado para ${order.dueDate}.`, order.id);
  saveState();
  return order;
}

export function deleteOrder(id) {
  const workspace = getWorkspace();
  const index = workspaceCollection("orders").findIndex((item) => item.id === id);
  if (index < 0) return false;
  workspace.orders.splice(index, 1);
  saveState();
  return true;
}

export function deleteOrders(ids) {
  const selected = new Set(ids);
  const workspace = getWorkspace();
  const before = workspace.orders.length;
  workspace.orders = workspace.orders.filter((order) => !selected.has(order.id));
  saveState();
  return before - workspace.orders.length;
}

export function addTransaction(values) {
  assertCanCreate(getWorkspace(), "transactions");
  const normalized = {
    type: values.type === "expense" ? "expense" : "income",
    amount: Number(values.amount || 0),
    date: values.date || new Date().toISOString().slice(0, 10),
    description: String(values.description || "").trim().toLocaleLowerCase(),
    clientId: values.clientId || "",
    orderId: values.orderId || "",
  };
  if (!Number.isFinite(normalized.amount) || normalized.amount <= 0) throw new Error("INVALID_TRANSACTION_AMOUNT");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.date) || Number.isNaN(new Date(`${normalized.date}T12:00:00`).getTime())) throw new Error("INVALID_TRANSACTION_DATE");
  if (workspaceCollection("transactions").some((item) => item.type === normalized.type && item.amount === normalized.amount && item.date === normalized.date && item.description.toLocaleLowerCase() === normalized.description && item.clientId === normalized.clientId && item.orderId === normalized.orderId)) throw new Error("DUPLICATE_TRANSACTION");
  const transaction = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    type: normalized.type,
    status: values.status === "pending" ? "pending" : "paid",
    description: String(values.description || "").trim(),
    amount: normalized.amount,
    date: normalized.date,
    category: String(values.category || "").trim(),
    clientId: values.clientId || "",
    orderId: values.orderId || "",
    notes: String(values.notes || "").trim(),
  };
  workspaceCollection("transactions").push(transaction);
  addActivity(`${transaction.type === "income" ? "Receita" : "Despesa"} registrada: ${transaction.description}`);
  if (transaction.clientId) addNotification(transaction.clientId, "finance", `Movimentação financeira registrada: ${transaction.description}.`, transaction.orderId);
  saveState();
  return transaction;
}

export function updateTransaction(id, values) {
  const transaction = workspaceCollection("transactions").find((item) => item.id === id);
  if (!transaction) return null;
  const type = values.type === "expense" ? "expense" : "income";
  const amount = Number(values.amount || 0);
  const date = values.date || transaction.date;
  const description = String(values.description || "").trim();
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_TRANSACTION_AMOUNT");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T12:00:00`).getTime())) throw new Error("INVALID_TRANSACTION_DATE");
  const duplicate = workspaceCollection("transactions").some((item) => item.id !== id
    && item.type === type
    && item.amount === amount
    && item.date === date
    && String(item.description || "").toLocaleLowerCase() === description.toLocaleLowerCase()
    && item.clientId === (values.clientId || "")
    && item.orderId === (values.orderId || ""));
  if (duplicate) throw new Error("DUPLICATE_TRANSACTION");
  Object.assign(transaction, {
    type,
    amount,
    date,
    status: values.status === "pending" ? "pending" : "paid",
    description,
    category: String(values.category || "").trim(),
    clientId: values.clientId || "",
    orderId: values.orderId || "",
    notes: String(values.notes || "").trim(),
    updatedAt: new Date().toISOString(),
  });
  saveState();
  return transaction;
}

export function getWorkspacePlan() {
  return getCurrentPlan(getWorkspace());
}

// Development-only helper. Production plan changes must be made by the backend after a validated payment webhook.
export function setDevelopmentPlan(planCode) {
  const workspace = getWorkspace();
  const plan = getPlan(planCode);
  if (!workspace) throw new Error("WORKSPACE_REQUIRED");
  workspace.planCode = plan.code;
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + (workspace.preferences?.billingPeriod === "year" ? 12 : 1));
  workspace.subscription = {
    ...(workspace.subscription || {}),
    planCode: plan.code,
    status: plan.code === PLAN_CODES.FREE ? SUBSCRIPTION_STATUSES.FREE : `ACTIVE_${plan.code.toUpperCase()}`,
    currentPeriodStart: plan.code === PLAN_CODES.FREE ? null : now.toISOString(),
    currentPeriodEnd: plan.code === PLAN_CODES.FREE ? null : end.toISOString(),
    nextBillingAt: plan.code === PLAN_CODES.FREE ? null : end.toISOString(),
    autoRenew: plan.code !== PLAN_CODES.FREE,
    canceledAt: null,
    updatedAt: now.toISOString(),
  };
  saveState();
  return plan;
}

export function resetDevelopmentPlan() {
  return setDevelopmentPlan(PLAN_CODES.FREE);
}

export function cancelSubscription() {
  const workspace = getWorkspace();
  const subscription = workspace?.subscription;
  if (!subscription || subscription.planCode === PLAN_CODES.FREE || !subscription.currentPeriodEnd) throw new Error("NO_ACTIVE_SUBSCRIPTION");
  subscription.status = SUBSCRIPTION_STATUSES.CANCEL_AT_PERIOD_END;
  subscription.autoRenew = false;
  subscription.canceledAt = new Date().toISOString();
  subscription.nextBillingAt = null;
  subscription.updatedAt = new Date().toISOString();
  saveState();
  return subscription;
}

export function setDevelopmentSubscription(planCode, status, periodEnd = "") {
  const plan = getPlan(planCode);
  const workspace = getWorkspace();
  if (!workspace) throw new Error("WORKSPACE_REQUIRED");
  workspace.planCode = plan.code === PLAN_CODES.FREE || status === SUBSCRIPTION_STATUSES.EXPIRED ? PLAN_CODES.FREE : plan.code;
  workspace.subscription = {
    ...(workspace.subscription || {}),
    planCode: workspace.planCode,
    status,
    currentPeriodStart: workspace.planCode === PLAN_CODES.FREE ? null : new Date().toISOString(),
    currentPeriodEnd: periodEnd || (workspace.planCode === PLAN_CODES.FREE ? null : new Date(Date.now() + 30 * 86400000).toISOString()),
    nextBillingAt: status === SUBSCRIPTION_STATUSES.CANCEL_AT_PERIOD_END ? null : periodEnd || null,
    autoRenew: status === SUBSCRIPTION_STATUSES.ACTIVE_PRO || status === SUBSCRIPTION_STATUSES.ACTIVE_BUSINESS,
    updatedAt: new Date().toISOString(),
  };
  saveState();
  return workspace.subscription;
}

export function deleteTransaction(id) {
  const workspace = getWorkspace();
  const index = workspaceCollection("transactions").findIndex((item) => item.id === id);
  if (index < 0) return false;
  workspace.transactions.splice(index, 1);
  saveState();
  return true;
}

export function deleteTransactions(ids) {
  const selected = new Set(ids);
  const workspace = getWorkspace();
  const before = workspace.transactions.length;
  workspace.transactions = workspace.transactions.filter((item) => !selected.has(item.id));
  saveState();
  return before - workspace.transactions.length;
}

export function updatePreferences(values) {
  const workspace = getWorkspace();
  workspace.preferences = {
    ...(workspace.preferences || {}),
    ...values,
    notifications: { ...(workspace.preferences?.notifications || {}), ...(values.notifications || {}) },
  };
  saveState();
}

export function applyTheme() {
  const preference = getWorkspace()?.preferences?.theme || "dark";
  const theme = preference === "system"
    ? (window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : preference;
  document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
}

export function isAuthenticated() {
  const user = getCurrentUser();
  const workspace = getWorkspace();
  return Boolean(user && workspace && user.status !== "DEACTIVATED" && user.status !== "DELETED" && workspace.status !== "DEACTIVATED" && workspace.status !== "DELETED");
}
