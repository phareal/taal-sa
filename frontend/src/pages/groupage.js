import { api } from "../api.js";
import { fmt, escapeHtml } from "../format.js";
import { statutBadge } from "../ui.js";

export async function renderGroupage(root) {
  root.innerHTML = `<div style="padding:32px; color:var(--text3);">Chargement…</div>`;
  let data;
  try { data = await api.get("/api/conteneurs/", { params: { page: 1, page_size: 100 } }); }
  catch (_) { data = { items: [], total: 0 }; }

  const rows = data.items ?? [];
  root.innerHTML = `
    <div class="app-card">
      <div class="card-header">
        <div class="card-title">Conteneurs / Groupage</div>
        <span class="card-badge">${data.total ?? 0} conteneur(s)</span>
      </div>
      ${rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucun conteneur</div>`
        : `
        <table class="data-table w-full">
          <thead><tr><th>N° TC</th><th>Type</th><th>Statut</th><th>B/L</th><th>CA (FCFA)</th><th>Marge</th><th>Partenaire</th></tr></thead>
          <tbody>
            ${rows.map(c => `
              <tr>
                <td style="font-family:'DM Mono',monospace; color:var(--gold2); font-size:11px;">${escapeHtml(c.numero_tc ?? "—")}</td>
                <td>${escapeHtml(c.type_tc ?? "—")}</td>
                <td>${statutBadge(c.statut_tc)}</td>
                <td>${c.nb_bl ?? 0}</td>
                <td class="gold-text">${fmt.fcfa(c.ca_fcfa)}</td>
                <td style="color:${(c.marge_fcfa ?? 0) < 0 ? "var(--red)" : "var(--green)"};">${fmt.fcfa(c.marge_fcfa)}</td>
                <td>${escapeHtml(c.partenaire ?? "—")}</td>
              </tr>`).join("")}
          </tbody>
        </table>`}
    </div>`;
}
