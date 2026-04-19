import { api } from "../api.js";
import { escapeHtml } from "../format.js";
import { statutBadge } from "../ui.js";

export async function renderAudit(root) {
  root.innerHTML = `<div style="padding:32px; color:var(--text3);">Chargement…</div>`;
  let data;
  try { data = await api.get("/api/audit/", { params: { page: 1, page_size: 100 } }); }
  catch (_) { data = { items: [], total: 0 }; }

  const rows = data.items ?? [];
  root.innerHTML = `
    <div class="app-card">
      <div class="card-header">
        <div class="card-title">Audit &amp; Conformité</div>
        <span class="card-badge">${data.total ?? 0} mission(s)</span>
      </div>
      ${rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucune mission d'audit</div>`
        : `
        <table class="data-table w-full">
          <thead><tr><th>Date</th><th>Type</th><th>Domaine</th><th>Observation</th><th>Conformité</th><th>Statut</th></tr></thead>
          <tbody>
            ${rows.map(a => `
              <tr>
                <td>${escapeHtml(a.date_audit ?? "—")}</td>
                <td>${statutBadge(a.type_audit)}</td>
                <td>${escapeHtml(a.domaine ?? "—")}</td>
                <td style="color:var(--text2); max-width:300px; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(a.observation ?? "—")}</td>
                <td>${statutBadge(a.conformite)}</td>
                <td>${statutBadge(a.statut)}</td>
              </tr>`).join("")}
          </tbody>
        </table>`}
    </div>`;
}
