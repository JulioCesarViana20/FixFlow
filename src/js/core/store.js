const STORAGE_KEY = "fixflow.app.v1";

const emptyState = {
  users: [],
  workspaces: {},
  session: null,
};

let state = loadState();

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || emptyState;
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
  return state.session ? state.workspaces[state.session.workspaceId] : null;
}

export function getCurrentUser() {
  return state.session
    ? state.users.find((user) => user.id === state.session.userId) || null
    : null;
}

export async function createAccount({ name, email, password, userId, workspaceId }) {
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
    activities: [],
  };
  state.session = { userId: user.id, workspaceId };
  saveState();
}

export async function signIn(email, password) {
  const passwordHash = await hashPassword(password);
  const user = state.users.find(
    (item) => item.email === email && item.passwordHash === passwordHash,
  );

  if (!user) return false;
  state.session = { userId: user.id, workspaceId: user.workspaceId };
  saveState();
  return true;
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

export function isAuthenticated() {
  return Boolean(getWorkspace());
}
