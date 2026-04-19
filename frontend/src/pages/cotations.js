import { api } from "../api.js";
import { fmt, escapeHtml } from "../format.js";
import { getQuery, setQuery } from "../router.js";
import { statutBadge } from "../ui.js";

const PAGE_SIZE = 20;

export async function renderCotations(root) {
  const q = getQuery();
  const state = { page: Number(q.page) || 1, resultat: q.resultat || "", data: null, loading: true };
  draw();

  async function load() {
    state.loading = true; draw();
    try {
      const params = { page: state.page, page_size: PAGE_SIZE };
      if (state.resultat) params.resultat = state.resultat;
      state.data = await api.get("/api/cotations/", { params });
      setQuery({ page: state.page !== 1 ? state.page : "", resultat: state.resultat });
    } catch (_) {
      state.data = { items: [], total: 0, pages: 0 };
    } finally { state.loading = false; draw(); }
  }

  function draw() {
    const rows = state.data?.items ?? [];
    const total = state.data?.total ?? 0;
    const pages = state.data?.pages ?? 0;

    root.innerHTML = `
      <div class="app-card flex flex-col gap-4">
        <div class="card-header" style="margin-bottom:0;">
          <div class="card-title">Cotations Commerciales</div>
          <div class="flex items-center gap-2.5">
            <select class="filter-select" id="cot-filter">
              <option value="">Tous résultats</option>
              <option value="GAGNÉ"    ${state.resultat === "GAGNÉ" ? "selected" : ""}>Gagné</option>
              <option value="PERDU"    ${state.resultat === "PERDU" ? "selected" : ""}>Perdu</option>
              <option value="EN COURS" ${state.resultat === "EN COURS" ? "selected" : ""}>En cours</option>
              <option value="ANNULÉ"   ${state.resultat === "ANNULÉ" ? "selected" : ""}>Annulé</option>
            </select>
            <span class="card-badge">${total} cotation(s)</span>
          </div>
        </div>
        ${state.loading ? `<div style="padding:32px; text-align:center; color:var(--text3);">Chargement…</div>`
          : rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucune cotation</div>`
          : `
          <table class="data-table w-full">
            <thead><tr><th>N° COT</th><th>Date</th><th>Type</th><th>Cotation client</th><th>Marge</th><th>Résultat</th><th>Agent</th></tr></thead>
            <tbody>
              ${rows.map(c => `
                <tr>
                  <td style="font-family:'DM Mono',monospace; color:var(--gold2); font-size:11px;">${escapeHtml(c.numero_cotation)}</td>
                  <td>${escapeHtml(c.date_cotation ?? "—")}</td>
                  <td>${escapeHtml(c.type_service ?? "—")}</td>
                  <td class="gold-text">${fmt.fcfa(c.cotation_client)}</td>
                  <td style="color:${(c.marge ?? 0) < 0 ? "var(--red)" : "var(--green)"};">${fmt.fcfa(c.marge)}</td>
                  <td>${statutBadge(c.resultat)}</td>
                  <td style="color:var(--text3);">${escapeHtml(c.agent_commercial ?? "—")}</td>
                </tr>`).join("")}
            </tbody>
          </table>
          <div class="flex items-center justify-between px-2 py-3" style="color:var(--text3); font-size:12px;">
            <div>Page ${state.page} / ${Math.max(pages, 1)}</div>
            <div class="flex gap-2">
              <button class="btn-ghost" id="cot-prev" ${state.page <= 1 ? "disabled" : ""} style="padding:4px 12px;">← Préc.</button>
              <button class="btn-ghost" id="cot-next" ${state.page >= pages ? "disabled" : ""} style="padding:4px 12px;">Suiv. →</button>
            </div>
          </div>`}
      </div>`;

    root.querySelector("#cot-filter")?.addEventListener("change", (e) => { state.resultat = e.target.value; state.page = 1; load(); });
    root.querySelector("#cot-prev")?.addEventListener("click", () => { if (state.page > 1) { state.page--; load(); } });
    root.querySelector("#cot-next")?.addEventListener("click", () => { state.page++; load(); });
  }

  load();
}
