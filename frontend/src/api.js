const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request(path, { method = "GET", body, params, headers = {} } = {}) {
  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    }
    const qstr = qs.toString();
    if (qstr) url += (url.includes("?") ? "&" : "?") + qstr;
  }

  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(body != null ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "Erreur réseau" }));
    console.error(`[api] ${method} ${path} → ${data.detail}`);
    throw Object.assign(new Error(data.detail || `HTTP ${res.status}`), { data });
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get:  (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put:  (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  del:  (path, opts) => request(path, { ...opts, method: "DELETE" }),
};
