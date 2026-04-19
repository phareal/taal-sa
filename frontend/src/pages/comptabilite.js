import { api } from "../api.js";
import { fmt, escapeHtml } from "../format.js";
import { getQuery, setQuery } from "../router.js";
import { openModal, confirmDelete, statutBadge, ICONS } from "../ui.js";

const PAGE_SIZE = 20;
const TYPES_OP = ["RECETTE", "DEPENSE"];
const STATUTS_PAIEMENT = ["EN ATTENTE", "PAYÉ", "PARTIEL", "ANNULÉ"];
const DEVISES = ["XOF", "EUR", "USD"];

export async function renderComptabilite(root) {
  const q = getQuery();
  const year = new Date().getFullYear();
  const state = {
    page: Number(q.page) || 1,
    annee: q.annee || String(year),
    type_operation: q.type_operation || "",
    statut_paiement: q.statut_paiement || "",
    search: q.search || "",
    data: null, summary: null, loading: false,
  };

  async function load() {
    state.loading = true; draw();
    try {
      const params = { page: state.page, page_size: PAGE_SIZE };
      if (state.annee) params.annee = state.annee;
      if (state.type_operation) params.type_operation = state.type_operation;
      if (state.statut_paiement) params.statut_paiement = state.statut_paiement;
      if (state.search) params.search = state.search;
      const [data, summary] = await Promise.all([
        api.get("/api/comptabilite/", { params }),
        api.get(`/api/comptabilite/summary${state.annee ? `?annee=${state.annee}` : ""}`).catch(() => null),
      ]);
      state.data = data; state.summary = summary;
      setQuery({
        page: state.page !== 1 ? state.page : "",
        annee: state.annee, type_operation: state.type_operation,
        statut_paiement: state.statut_paiement, search: state.search,
      });
    } catch (_) {
      state.data = { items: [], total: 0, pages: 0 };
    } finally { state.loading = false; draw(); }
  }

  function draw() {
    const rows = state.data?.items ?? [];
    const total = state.data?.total ?? 0;
    const pages = state.data?.pages ?? 0;
    const summary = state.summary;

    root.innerHTML = `
      ${summary ? `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div class="kpi-card"><div class="kpi-label">Recettes ${state.annee}</div><div class="kpi-value" style="color:var(--green); font-size:18px;">${fmt.fcfa(summary.total_recettes)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Dépenses ${state.annee}</div><div class="kpi-value" style="color:var(--red); font-size:18px;">${fmt.fcfa(summary.total_depenses)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Résultat net</div><div class="kpi-value" style="font-size:18px; color:${summary.resultat_net >= 0 ? "var(--green)" : "var(--red)"};">${fmt.fcfa(summary.resultat_net)}</div></div>
        <div class="kpi-card"><div class="kpi-label">En attente</div><div class="kpi-value" style="color:#EF9F27; font-size:18px;">${fmt.fcfa(summary.montant_en_attente)}</div></div>
      </div>` : ""}

      <div class="app-card flex flex-col gap-4">
        <div class="card-header" style="margin-bottom:0;">
          <div class="card-title">Écritures comptables</div>
          <div class="flex flex-wrap items-center gap-2.5">
            <input class="filter-select" style="width:200px;" id="cp-search" placeholder="Rechercher…" value="${escapeHtml(state.search)}" />
            <input class="filter-select" style="width:90px;" id="cp-annee" type="number" value="${escapeHtml(state.annee)}" />
            <select class="filter-select" id="cp-type">
              <option value="">Tous types</option>
              ${TYPES_OP.map(t => `<option value="${t}" ${state.type_operation === t ? "selected" : ""}>${t}</option>`).join("")}
            </select>
            <select class="filter-select" id="cp-paiement">
              <option value="">Tous paiements</option>
              ${STATUTS_PAIEMENT.map(s => `<option value="${s}" ${state.statut_paiement === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
            <span class="card-badge">${total} entrée(s)</span>
            <button class="btn-primary" id="cp-create" style="padding:6px 14px;">+ Nouvelle écriture</button>
          </div>
        </div>
        ${state.loading ? `<div style="padding:32px; text-align:center; color:var(--text3);">Chargement…</div>`
          : rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucune écriture</div>`
          : `
          <table class="data-table w-full">
            <thead><tr><th>Date</th><th>Type</th><th>Catégorie</th><th>Libellé</th><th>Montant</th><th>Paiement</th><th style="text-align:right;">Actions</th></tr></thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td>${escapeHtml(r.date_op ?? r.date_operation ?? "—")}</td>
                  <td>${statutBadge(r.type_operation ?? r.type_compta)}</td>
                  <td>${escapeHtml(r.categorie ?? "—")}</td>
                  <td style="color:var(--text);">${escapeHtml(r.libelle ?? "—")}</td>
                  <td style="color:${(r.type_operation ?? r.type_compta) === "DEPENSE" ? "var(--red)" : "var(--green)"};">${fmt.fcfa(r.montant_fcfa)}</td>
                  <td>${statutBadge(r.statut_paiement ?? r.statut)}</td>
                  <td style="text-align:right;">
                    <button class="btn-icon" data-act="edit" data-id="${r.id}">${ICONS.edit}</button>
                    <button class="btn-icon danger" data-act="del" data-id="${r.id}">${ICONS.trash}</button>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
          <div class="flex items-center justify-between px-2 py-3" style="color:var(--text3); font-size:12px;">
            <div>Page ${state.page} / ${Math.max(pages, 1)} · ${total} résultat(s)</div>
            <div class="flex gap-2">
              <button class="btn-ghost" id="cp-prev" ${state.page <= 1 ? "disabled" : ""} style="padding:4px 12px;">← Préc.</button>
              <button class="btn-ghost" id="cp-next" ${state.page >= pages ? "disabled" : ""} style="padding:4px 12px;">Suiv. →</button>
            </div>
          </div>`}
      </div>`;

    wire(rows);
  }

  function wire(rows) {
    let t;
    root.querySelector("#cp-search")?.addEventListener("input", (e) => {
      clearTimeout(t);
      t = setTimeout(() => { state.search = e.target.value; state.page = 1; load(); }, 400);
    });
    root.querySelector("#cp-annee")?.addEventListener("change", (e) => { state.annee = e.target.value; state.page = 1; load(); });
    root.querySelector("#cp-type")?.addEventListener("change", (e) => { state.type_operation = e.target.value; state.page = 1; load(); });
    root.querySelector("#cp-paiement")?.addEventListener("change", (e) => { state.statut_paiement = e.target.value; state.page = 1; load(); });
    root.querySelector("#cp-create")?.addEventListener("click", () => openForm());
    root.querySelector("#cp-prev")?.addEventListener("click", () => { if (state.page > 1) { state.page--; load(); } });
    root.querySelector("#cp-next")?.addEventListener("click", () => { state.page++; load(); });
    root.querySelectorAll("[data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const row = rows.find(r => r.id == id);
        if (btn.getAttribute("data-act") === "edit") openForm(row);
        else confirmDelete({ label: row?.libelle, onConfirm: async () => { await api.del(`/api/comptabilite/${id}`); load(); } });
      });
    });
  }

  function openForm(row) {
    const isEdit = !!row;
    const f = row || {
      date_op: new Date().toISOString().slice(0, 10), libelle: "",
      type_operation: "RECETTE", categorie: "", montant_fcfa: "",
      devise: "XOF", reference_doc: "", statut_paiement: "EN ATTENTE",
      date_echeance: "", date_paiement: "", service: "", notes: "",
    };

    openModal({
      title: isEdit ? "Modifier l'écriture" : "Nouvelle écriture",
      bodyHTML: `
        <form id="cp-form" class="flex flex-col gap-3">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Date opération *</label><input name="date_op" type="date" class="form-input" value="${escapeHtml(f.date_op ?? f.date_operation ?? "")}" required /></div>
            <div><label class="form-label">Type *</label>
              <select name="type_operation" class="form-input" required>
                ${TYPES_OP.map(t => `<option value="${t}" ${(f.type_operation ?? f.type_compta) === t ? "selected" : ""}>${t}</option>`).join("")}
              </select>
            </div>
          </div>
          <div><label class="form-label">Libellé *</label><input name="libelle" class="form-input" value="${escapeHtml(f.libelle ?? "")}" required /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Catégorie</label><input name="categorie" class="form-input" value="${escapeHtml(f.categorie ?? "")}" /></div>
            <div><label class="form-label">Service</label><input name="service" class="form-input" value="${escapeHtml(f.service ?? "")}" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Montant (FCFA)</label><input name="montant_fcfa" type="number" class="form-input" value="${f.montant_fcfa ?? ""}" /></div>
            <div><label class="form-label">Devise</label>
              <select name="devise" class="form-input">
                ${DEVISES.map(d => `<option value="${d}" ${f.devise === d ? "selected" : ""}>${d}</option>`).join("")}
              </select>
            </div>
          </div>
          <div><label class="form-label">Référence document</label><input name="reference_doc" class="form-input" value="${escapeHtml(f.reference_doc ?? "")}" /></div>
          <div class="grid grid-cols-3 gap-3">
            <div><label class="form-label">Statut paiement</label>
              <select name="statut_paiement" class="form-input">
                ${STATUTS_PAIEMENT.map(s => `<option value="${s}" ${(f.statut_paiement ?? f.statut) === s ? "selected" : ""}>${s}</option>`).join("")}
              </select>
            </div>
            <div><label class="form-label">Échéance</label><input name="date_echeance" type="date" class="form-input" value="${escapeHtml(f.date_echeance ?? "")}" /></div>
            <div><label class="form-label">Paiement</label><input name="date_paiement" type="date" class="form-input" value="${escapeHtml(f.date_paiement ?? "")}" /></div>
          </div>
          <div><label class="form-label">Notes</label><textarea name="notes" class="form-input" rows="2">${escapeHtml(f.notes ?? "")}</textarea></div>
          <p id="cp-err" class="form-error" style="display:none;"></p>
        </form>
      `,
      footerHTML: `
        <button class="btn-ghost" data-modal-close>Annuler</button>
        <button class="btn-primary" data-submit>${isEdit ? "Mettre à jour" : "Créer"}</button>
      `,
      onMount: (overlay, close) => {
        overlay.querySelector("[data-submit]").addEventListener("click", async (e) => {
          e.preventDefault();
          const fd = new FormData(overlay.querySelector("#cp-form"));
          const body = {};
          fd.forEach((v, k) => body[k] = v === "" ? null : v);
          if (body.montant_fcfa != null) body.montant_fcfa = parseInt(body.montant_fcfa, 10);
          const err = overlay.querySelector("#cp-err");
          if (!body.libelle) { err.textContent = "Le libellé est obligatoire."; err.style.display = "block"; return; }
          if (!body.date_op) { err.textContent = "La date est obligatoire."; err.style.display = "block"; return; }
          try {
            if (isEdit) await api.put(`/api/comptabilite/${row.id}`, body);
            else        await api.post("/api/comptabilite/", body);
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
