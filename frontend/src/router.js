const routes = new Map();
let currentCleanup = null;

export function route(path, handler) {
  routes.set(path, handler);
}

export function navigate(path) {
  if (location.pathname === path) return;
  history.pushState({}, "", path);
  render();
}

export function currentPath() {
  return location.pathname;
}

export function getQuery() {
  const q = {};
  new URLSearchParams(location.search).forEach((v, k) => (q[k] = v));
  return q;
}

export function setQuery(next) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) {
    if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  history.replaceState({}, "", location.pathname + suffix);
}

async function render() {
  if (typeof currentCleanup === "function") {
    try { currentCleanup(); } catch (_) {}
    currentCleanup = null;
  }

  const handler = routes.get(location.pathname) || routes.get("*");
  if (!handler) return;

  try {
    const result = await handler();
    if (typeof result === "function") currentCleanup = result;
  } catch (err) {
    console.error("[router] render error:", err);
    const main = document.getElementById("page-content");
    if (main) {
      main.innerHTML = `
        <div class="app-card">
          <div class="section-title" style="color:var(--red);">Erreur</div>
          <div style="color:var(--text2);">${err.message || "Une erreur est survenue."}</div>
        </div>`;
    }
  }
}

export function start() {
  window.addEventListener("popstate", render);
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-link]");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("#")) return;
    e.preventDefault();
    navigate(href);
  });
  render();
}
