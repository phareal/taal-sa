import { api } from "../api.js";
import { fmt, escapeHtml } from "../format.js";
import { statutBadge } from "../ui.js";

export async function renderComptabilite(root) {
  root.innerHTML = `<div style="padding:32px; color:var(--text3);">Chargement…</div>`;
  const year = new Date().getFullYear();
  const [data, summary] = await Promise.all([
    api.get("/api/comptabilite/", { params: { page: 1, page_size: 100 } }).catch(() => ({ items: [], total: 0 })),
    api.get(`/api/comptabilite/summary?annee=${year}`).catch(() => null),
  ]);

  const rows = data.items ?? [];
  root.innerHTML = `
    ${summary ? `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <div class="kpi-card"><div class="kpi-label">Recettes ${year}</div><div class="kpi-value" style="color:var(--green); font-size:18px;">${fmt.fcfa(summary.total_recettes)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Dépenses ${year}</div><div class="kpi-value" style="color:var(--red); font-size:18px;">${fmt.fcfa(summary.total_depenses)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Résultat net</div><div class="kpi-value" style="font-size:18px; color:${summary.resultat_net >= 0 ? "var(--green)" : "var(--red)"};">${fmt.fcfa(summary.resultat_net)}</div></div>
      <div class="kpi-card"><div class="kpi-label">En attente</div><div class="kpi-value" style="color:#EF9F27; font-size:18px;">${fmt.fcfa(summary.montant_en_attente)}</div></div>
    </div>` : ""}

    <div class="app-card">
      <div class="card-header">
        <div class="card-title">Écritures comptables</div>
        <span class="card-badge">${data.total ?? 0} entrée(s)</span>
      </div>
      ${rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucune écriture</div>`
        : `
        <table class="data-table w-full">
          <thead><tr><th>Date</th><th>Type</th><th>Catégorie</th><th>Libellé</th><th>Montant</th><th>Statut</th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${escapeHtml(r.date_operation ?? "—")}</td>
                <td>${statutBadge(r.type_compta)}</td>
                <td>${escapeHtml(r.categorie ?? "—")}</td>
                <td style="color:var(--text);">${escapeHtml(r.libelle ?? "—")}</td>
                <td style="color:${r.type_compta === "DÉPENSE" ? "var(--red)" : "var(--green)"};">${fmt.fcfa(r.montant_fcfa)}</td>
                <td>${statutBadge(r.statut)}</td>
              </tr>`).join("")}
          </tbody>
        </table>`}
    </div>`;
}
