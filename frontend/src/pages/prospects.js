import { api } from "../api.js";
import { fmt, escapeHtml } from "../format.js";
import { statutBadge } from "../ui.js";

export async function renderProspects(root) {
  root.innerHTML = `<div style="padding:32px; color:var(--text3);">Chargement…</div>`;
  let data;
  try { data = await api.get("/api/prospects/", { params: { page: 1, page_size: 100 } }); }
  catch (_) { data = { items: [], total: 0 }; }

  const rows = data.items ?? [];
  root.innerHTML = `
    <div class="app-card">
      <div class="card-header">
        <div class="card-title">Prospection Commerciale</div>
        <span class="card-badge">${data.total ?? 0} prospect(s)</span>
      </div>
      ${rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucun prospect</div>`
        : `
        <table class="data-table w-full">
          <thead><tr><th>Statut</th><th>Priorité</th><th>CA pic</th><th>Dernière op.</th><th>Action prévue</th><th>Relance</th></tr></thead>
          <tbody>
            ${rows.map(p => `
              <tr>
                <td>${escapeHtml(p.type_statut ?? "—")}</td>
                <td>${statutBadge(p.priorite)}</td>
                <td class="gold-text">${fmt.fcfa(p.ca_pic_fcfa)}</td>
                <td>${p.annee_derniere_op ?? "—"}</td>
                <td style="color:var(--text2);">${escapeHtml(p.action_prevue ?? "—")}</td>
                <td>${statutBadge(p.statut_relance)}</td>
              </tr>`).join("")}
          </tbody>
        </table>`}
    </div>`;
}
