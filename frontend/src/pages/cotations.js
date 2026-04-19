import { api } from "../api.js";
import { fmt, escapeHtml } from "../format.js";
import { getQuery, setQuery } from "../router.js";
import { openModal, confirmDelete, statutBadge, ICONS } from "../ui.js";

const PAGE_SIZE = 20;

const NATURE_OPS = [
  "MARITIME_LCL", "FCL", "AERIEN", "ROUTIER",
  "TRANSIT", "ENTREPOSAGE", "CONSIGNATION", "DIVERS",
];
const RESULTATS = ["EN COURS", "GAGNÉ", "PERDU", "ANNULÉ"];
const STATUTS_PAIEMENT = ["EN ATTENTE", "PAYÉ", "PARTIEL"];
const DEVISES = ["EUR", "USD", "XOF"];

let CLIENTS_CACHE = null;
async function loadClients() {
  if (CLIENTS_CACHE) return CLIENTS_CACHE;
  try {
    const data = await api.get("/api/clients/", { params: { page: 1, page_size: 500 } });
    CLIENTS_CACHE = data.items ?? [];
  } catch (_) { CLIENTS_CACHE = []; }
  return CLIENTS_CACHE;
}

export async function renderCotations(root) {
  const q = getQuery();
  const state = {
    page: Number(q.page) || 1,
    resultat: q.resultat || "",
    search: q.search || "",
    data: null, loading: false,
  };

  async function load() {
    state.loading = true; draw();
    try {
      const params = { page: state.page, page_size: PAGE_SIZE };
      if (state.resultat) params.resultat = state.resultat;
      if (state.search) params.search = state.search;
      state.data = await api.get("/api/cotations/", { params });
      setQuery({ page: state.page !== 1 ? state.page : "", resultat: state.resultat, search: state.search });
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
          <div class="flex flex-wrap items-center gap-2.5">
            <input class="filter-select" style="width:200px;" id="cot-search" placeholder="Rechercher…" value="${escapeHtml(state.search)}" />
            <select class="filter-select" id="cot-filter">
              <option value="">Tous résultats</option>
              ${RESULTATS.map(r => `<option value="${r}" ${state.resultat === r ? "selected" : ""}>${r}</option>`).join("")}
            </select>
            <span class="card-badge">${total} cotation(s)</span>
            <button class="btn-primary" id="cot-create" style="padding:6px 14px;">+ Nouvelle cotation</button>
          </div>
        </div>
        ${state.loading ? `<div style="padding:32px; text-align:center; color:var(--text3);">Chargement…</div>`
          : rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucune cotation</div>`
          : `
          <table class="data-table w-full">
            <thead><tr><th>N° COT</th><th>Date</th><th>Nature</th><th>Cotation client</th><th>Marge</th><th>Résultat</th><th>Agent</th><th style="text-align:right;">Actions</th></tr></thead>
            <tbody>
              ${rows.map(c => `
                <tr>
                  <td style="font-family:'DM Mono',monospace; color:var(--gold2); font-size:11px;">${escapeHtml(c.numero_cotation ?? "—")}</td>
                  <td>${escapeHtml(c.date_cotation ?? "—")}</td>
                  <td>${escapeHtml(c.nature_operation ?? c.type_service ?? "—")}</td>
                  <td class="gold-text">${fmt.fcfa(c.cotation_client)}</td>
                  <td style="color:${(c.marge ?? 0) < 0 ? "var(--red)" : "var(--green)"};">${fmt.fcfa(c.marge)}</td>
                  <td>${statutBadge(c.resultat)}</td>
                  <td style="color:var(--text3);">${escapeHtml(c.agent_commercial ?? "—")}</td>
                  <td style="text-align:right;">
                    <button class="btn-icon" data-act="edit" data-id="${c.id}">${ICONS.edit}</button>
                    <button class="btn-icon danger" data-act="del" data-id="${c.id}">${ICONS.trash}</button>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
          <div class="flex items-center justify-between px-2 py-3" style="color:var(--text3); font-size:12px;">
            <div>Page ${state.page} / ${Math.max(pages, 1)} · ${total} résultat(s)</div>
            <div class="flex gap-2">
              <button class="btn-ghost" id="cot-prev" ${state.page <= 1 ? "disabled" : ""} style="padding:4px 12px;">← Préc.</button>
              <button class="btn-ghost" id="cot-next" ${state.page >= pages ? "disabled" : ""} style="padding:4px 12px;">Suiv. →</button>
            </div>
          </div>`}
      </div>`;

    wire(rows);
  }

  function wire(rows) {
    let t;
    root.querySelector("#cot-search")?.addEventListener("input", (e) => {
      clearTimeout(t);
      t = setTimeout(() => { state.search = e.target.value; state.page = 1; load(); }, 400);
    });
    root.querySelector("#cot-filter")?.addEventListener("change", (e) => { state.resultat = e.target.value; state.page = 1; load(); });
    root.querySelector("#cot-create")?.addEventListener("click", () => openForm());
    root.querySelector("#cot-prev")?.addEventListener("click", () => { if (state.page > 1) { state.page--; load(); } });
    root.querySelector("#cot-next")?.addEventListener("click", () => { state.page++; load(); });
    root.querySelectorAll("[data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const row = rows.find(r => r.id == id);
        if (btn.getAttribute("data-act") === "edit") openForm(row);
        else confirmDelete({ label: row?.numero_cotation, onConfirm: async () => { await api.del(`/api/cotations/${id}`); load(); } });
      });
    });
  }

  async function openForm(row) {
    const isEdit = !!row;
    const clients = await loadClients();
    const f = row || {
      numero_cotation: "", date_cotation: new Date().toISOString().slice(0, 10),
      client_id: "", nature_operation: "MARITIME_LCL", type_service: "",
      offre_transitaire: "", cotation_client: "", marge: "", devise: "EUR",
      resultat: "EN COURS", agent_commercial: "", observations: "",
      montant_facture_fcfa: "", date_facture: "", statut_paiement: "EN ATTENTE",
    };

    openModal({
      title: isEdit ? `Modifier cotation ${escapeHtml(f.numero_cotation || "")}` : "Nouvelle cotation",
      bodyHTML: `
        <form id="cot-form" class="flex flex-col gap-3">
          ${isEdit ? `<div><label class="form-label">N° COT</label><input class="form-input" value="${escapeHtml(f.numero_cotation ?? "")}" disabled /></div>` : ""}
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Date cotation</label><input name="date_cotation" type="date" class="form-input" value="${escapeHtml(f.date_cotation ?? "")}" /></div>
            <div><label class="form-label">Client</label>
              <select name="client_id" class="form-input">
                <option value="">— Aucun —</option>
                ${clients.map(c => `<option value="${c.id}" ${String(f.client_id) === String(c.id) ? "selected" : ""}>${escapeHtml(c.nom)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Nature opération</label>
              <select name="nature_operation" class="form-input">
                ${NATURE_OPS.map(n => `<option value="${n}" ${f.nature_operation === n ? "selected" : ""}>${n}</option>`).join("")}
              </select>
            </div>
            <div><label class="form-label">Type service</label><input name="type_service" class="form-input" value="${escapeHtml(f.type_service ?? "")}" /></div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div><label class="form-label">Offre transitaire</label><input name="offre_transitaire" type="number" step="0.01" class="form-input" value="${f.offre_transitaire ?? ""}" /></div>
            <div><label class="form-label">Cotation client</label><input name="cotation_client" type="number" step="0.01" class="form-input" value="${f.cotation_client ?? ""}" /></div>
            <div><label class="form-label">Marge <span style="opacity:.6;font-weight:400;">(auto)</span></label><input name="marge" type="number" step="0.01" class="form-input" value="${f.marge ?? ""}" readonly tabindex="-1" style="background:var(--surface-muted,#f3f4f6);" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Devise</label>
              <select name="devise" class="form-input">
                ${DEVISES.map(d => `<option value="${d}" ${f.devise === d ? "selected" : ""}>${d}</option>`).join("")}
              </select>
            </div>
            <div><label class="form-label">Résultat</label>
              <select name="resultat" class="form-input">
                ${RESULTATS.map(r => `<option value="${r}" ${f.resultat === r ? "selected" : ""}>${r}</option>`).join("")}
              </select>
            </div>
          </div>
          <div><label class="form-label">Agent commercial</label><input name="agent_commercial" class="form-input" value="${escapeHtml(f.agent_commercial ?? "")}" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Montant facturé (FCFA)</label><input name="montant_facture_fcfa" type="number" class="form-input" value="${f.montant_facture_fcfa ?? ""}" /></div>
            <div><label class="form-label">Date facture</label><input name="date_facture" type="date" class="form-input" value="${escapeHtml(f.date_facture ?? "")}" /></div>
          </div>
          <div><label class="form-label">Statut paiement</label>
            <select name="statut_paiement" class="form-input">
              ${STATUTS_PAIEMENT.map(s => `<option value="${s}" ${f.statut_paiement === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </div>
          <div><label class="form-label">Observations</label><textarea name="observations" class="form-input" rows="2">${escapeHtml(f.observations ?? "")}</textarea></div>
          <p id="cot-err" class="form-error" style="display:none;"></p>
        </form>
      `,
      footerHTML: `
        <button class="btn-ghost" data-modal-close>Annuler</button>
        <button class="btn-primary" data-submit>${isEdit ? "Mettre à jour" : "Créer"}</button>
      `,
      onMount: (overlay, close) => {
        const formEl = overlay.querySelector("#cot-form");
        const offreInput = formEl.querySelector('[name="offre_transitaire"]');
        const cotInput   = formEl.querySelector('[name="cotation_client"]');
        const margeInput = formEl.querySelector('[name="marge"]');
        const recalc = () => {
          const o = offreInput.value === "" ? null : Number(offreInput.value);
          const c = cotInput.value === "" ? null : Number(cotInput.value);
          if (o == null || c == null || Number.isNaN(o) || Number.isNaN(c)) {
            margeInput.value = "";
            return;
          }
          margeInput.value = Math.round((c - o) * 100) / 100;
        };
        offreInput.addEventListener("input", recalc);
        cotInput.addEventListener("input", recalc);

        overlay.querySelector("[data-submit]").addEventListener("click", async (e) => {
          e.preventDefault();
          const fd = new FormData(overlay.querySelector("#cot-form"));
          const body = {};
          fd.forEach((v, k) => body[k] = v === "" ? null : v);
          ["client_id", "montant_facture_fcfa"].forEach(k => { if (body[k] != null) body[k] = parseInt(body[k], 10); });
          ["offre_transitaire", "cotation_client", "marge"].forEach(k => { if (body[k] != null) body[k] = Number(body[k]); });
          const err = overlay.querySelector("#cot-err");
          try {
            if (isEdit) await api.put(`/api/cotations/${row.id}`, body);
            else        await api.post("/api/cotations/", body);
            close(); load();
          } catch (e) {
            err.textContent = e.data?.detail || e.message || "Erreur."; err.style.display = "block";
          }
        });
      },
    });
  }

  load();
}
