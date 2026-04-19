import { api } from "../api.js";
import { escapeHtml } from "../format.js";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export async function renderImport(root) {
  root.innerHTML = `
    <div class="app-card">
      <div class="card-header">
        <div class="card-title">Import Excel</div>
        <span class="card-badge">.xlsx / .xls</span>
      </div>

      <div style="padding:24px; border:2px dashed var(--border); border-radius:12px; text-align:center;" id="drop-zone">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5"
             style="margin:0 auto 12px;">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p style="color:var(--text2); margin-bottom:16px;">Glissez-déposez votre fichier Excel ou</p>
        <input type="file" id="file-input" accept=".xlsx,.xls" style="display:none;" />
        <button class="btn-primary" id="file-btn">Choisir un fichier</button>
        <p style="color:var(--text3); font-size:11px; margin-top:12px;">Upsert automatique sur le N° B/L</p>
      </div>

      <div id="import-result" style="margin-top:20px;"></div>

      <div class="app-card" style="margin-top:20px;">
        <div class="card-title" style="margin-bottom:12px;">Export Excel</div>
        <div class="flex gap-2">
          <a href="${API_BASE}/api/export/excel?format=xlsx" class="btn-primary" target="_blank" rel="noopener">Télécharger .xlsx</a>
          <a href="${API_BASE}/api/export/excel?format=csv"  class="btn-ghost"   target="_blank" rel="noopener">Télécharger .csv</a>
        </div>
      </div>
    </div>`;

  const input  = root.querySelector("#file-input");
  const btn    = root.querySelector("#file-btn");
  const zone   = root.querySelector("#drop-zone");
  const result = root.querySelector("#import-result");

  btn.addEventListener("click", () => input.click());
  input.addEventListener("change", () => upload(input.files[0]));
  ["dragenter", "dragover"].forEach(ev => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.style.background = "var(--goldl2)"; }));
  ["dragleave", "drop"].forEach(ev => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.style.background = ""; }));
  zone.addEventListener("drop", (e) => upload(e.dataTransfer.files[0]));

  async function upload(file) {
    if (!file) return;
    result.innerHTML = `<div class="app-card" style="color:var(--text3);">Import en cours — ${escapeHtml(file.name)}…</div>`;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/api/import/excel`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      result.innerHTML = `
        <div class="app-card">
          <div class="card-title" style="color:var(--green);">Import terminé</div>
          <div class="grid grid-cols-3 gap-3" style="margin:12px 0;">
            <div class="kpi-card"><div class="kpi-label">Insérés</div><div class="kpi-value" style="color:var(--green);">${data.inserted ?? 0}</div></div>
            <div class="kpi-card"><div class="kpi-label">Mis à jour</div><div class="kpi-value" style="color:var(--gold2);">${data.updated ?? 0}</div></div>
            <div class="kpi-card"><div class="kpi-label">Erreurs</div><div class="kpi-value" style="color:var(--red);">${data.errors?.length ?? 0}</div></div>
          </div>
          ${data.errors?.length ? `
          <details style="margin-top:8px;">
            <summary style="cursor:pointer; color:var(--text2);">Détails des erreurs</summary>
            <ul style="margin-top:8px; font-size:12px; color:var(--red);">
              ${data.errors.map(e => `<li>Ligne ${e.row}: ${escapeHtml(e.reason)}</li>`).join("")}
            </ul>
          </details>` : ""}
        </div>`;
    } catch (err) {
      result.innerHTML = `<div class="app-card" style="color:var(--red);">Erreur : ${escapeHtml(err.message)}</div>`;
    } finally {
      input.value = "";
    }
  }

  // API reference — not used here but imported to prevent tree-shaking if needed
  void api;
}
