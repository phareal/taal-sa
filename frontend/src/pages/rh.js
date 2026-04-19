import { api } from "../api.js";
import { fmt, escapeHtml } from "../format.js";
import { statutBadge } from "../ui.js";

export async function renderRH(root) {
  root.innerHTML = `<div style="padding:32px; color:var(--text3);">Chargement…</div>`;
  let data;
  try { data = await api.get("/api/employes/", { params: { page: 1, page_size: 100 } }); }
  catch (_) { data = { items: [], total: 0 }; }

  const rows = data.items ?? [];
  root.innerHTML = `
    <div class="app-card">
      <div class="card-header">
        <div class="card-title">Ressources Humaines — Effectifs</div>
        <span class="card-badge">${data.total ?? 0} employé(s)</span>
      </div>
      ${rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucun employé</div>`
        : `
        <table class="data-table w-full">
          <thead><tr><th>Matricule</th><th>Nom</th><th>Département</th><th>Poste</th><th>Salaire</th><th>Statut</th></tr></thead>
          <tbody>
            ${rows.map(e => `
              <tr>
                <td style="font-family:'DM Mono',monospace; color:var(--gold2); font-size:11px;">${escapeHtml(e.matricule ?? "—")}</td>
                <td style="color:var(--text); font-weight:500;">${escapeHtml(e.nom_complet ?? e.nom ?? "—")}</td>
                <td>${escapeHtml(e.departement ?? "—")}</td>
                <td>${escapeHtml(e.poste ?? "—")}</td>
                <td class="gold-text">${fmt.fcfa(e.salaire_fcfa)}</td>
                <td>${statutBadge(e.statut)}</td>
              </tr>`).join("")}
          </tbody>
        </table>`}
    </div>`;
}
