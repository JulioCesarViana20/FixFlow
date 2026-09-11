const routes = new Map();

export function registerRoute(path, handler) {
  routes.set(path, handler);
}

export function navigate(path, replace = false) {
  const nextUrl = `#${path}`;
  if (replace) history.replaceState({}, "", nextUrl);
  else history.pushState({}, "", nextUrl);
  renderCurrentRoute();
}

export function currentPath() {
  return window.location.hash.slice(1) || "/";
}

export function startRouter() {
  window.addEventListener("popstate", renderCurrentRoute);
  window.addEventListener("hashchange", renderCurrentRoute);
  renderCurrentRoute();
}

function renderCurrentRoute() {
  const handler = routes.get(currentPath()) || routes.get("/404");
  handler();
}
