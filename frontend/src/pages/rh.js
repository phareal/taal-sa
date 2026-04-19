import { api } from "../api.js";
import { fmt, escapeHtml } from "../format.js";
import { getQuery, setQuery } from "../router.js";
import { openModal, confirmDelete, statutBadge, ICONS } from "../ui.js";

const PAGE_SIZE = 20;
const DEPARTEMENTS = ["DIRECTION","COMMERCIAL","OPERATIONS","FINANCE","RH","INFORMATIQUE","LOGISTIQUE","DIVERS"];
const STATUTS = ["ACTIF","INACTIF","CONGÉ","SUSPENDU"];

export async function renderRH(root) {
  const q = getQuery();
  const state = {
    page: Number(q.page) || 1,
    search: q.search || "",
    departement: q.departement || "",
    statut: q.statut || "",
    data: null, loading: false,
  };

  async function load() {
    state.loading = true; draw();
    try {
      const params = { page: state.page, page_size: PAGE_SIZE };
      if (state.search) params.search = state.search;
      if (state.departement) params.departement = state.departement;
      if (state.statut) params.statut = state.statut;
      state.data = await api.get("/api/employes/", { params });
      setQuery({ page: state.page !== 1 ? state.page : "", search: state.search, departement: state.departement, statut: state.statut });
    } catch (_) {
      state.data = { items: [], total: 0, pages: 0 };
    } finally { state.loading = false; draw(); }
  }

  function fullName(e) {
    if (e.nom_complet) return e.nom_complet;
    return [e.prenom, e.nom].filter(Boolean).join(" ") || "—";
  }

  function draw() {
    const rows = state.data?.items ?? [];
    const total = state.data?.total ?? 0;
    const pages = state.data?.pages ?? 0;

    root.innerHTML = `
      <div class="app-card flex flex-col gap-4">
        <div class="card-header" style="margin-bottom:0;">
          <div class="card-title">Ressources Humaines — Effectifs</div>
          <div class="flex flex-wrap items-center gap-2.5">
            <input class="filter-select" style="width:200px;" id="rh-search" placeholder="Rechercher…" value="${escapeHtml(state.search)}" />
            <select class="filter-select" id="rh-dept">
              <option value="">Tous départements</option>
              ${DEPARTEMENTS.map(d => `<option value="${d}" ${state.departement === d ? "selected" : ""}>${d}</option>`).join("")}
            </select>
            <select class="filter-select" id="rh-statut">
              <option value="">Tous statuts</option>
              ${STATUTS.map(s => `<option value="${s}" ${state.statut === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
            <span class="card-badge">${total} employé(s)</span>
            <button class="btn-primary" id="rh-create" style="padding:6px 14px;">+ Nouvel employé</button>
          </div>
        </div>
        ${state.loading ? `<div style="padding:32px; text-align:center; color:var(--text3);">Chargement…</div>`
          : rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucun employé</div>`
          : `
          <table class="data-table w-full">
            <thead><tr><th>Matricule</th><th>Nom</th><th>Département</th><th>Poste</th><th>Salaire</th><th>Statut</th><th style="text-align:right;">Actions</th></tr></thead>
            <tbody>
              ${rows.map(e => `
                <tr>
                  <td style="font-family:'DM Mono',monospace; color:var(--gold2); font-size:11px;">${escapeHtml(e.matricule ?? "—")}</td>
                  <td style="color:var(--text); font-weight:500;">${escapeHtml(fullName(e))}</td>
                  <td>${escapeHtml(e.departement ?? "—")}</td>
                  <td>${escapeHtml(e.poste ?? "—")}</td>
                  <td class="gold-text">${fmt.fcfa(e.salaire_base_fcfa ?? e.salaire_fcfa)}</td>
                  <td>${statutBadge(e.statut)}</td>
                  <td style="text-align:right;">
                    <button class="btn-icon" data-act="edit" data-id="${e.id}">${ICONS.edit}</button>
                    <button class="btn-icon danger" data-act="del" data-id="${e.id}">${ICONS.trash}</button>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
          <div class="flex items-center justify-between px-2 py-3" style="color:var(--text3); font-size:12px;">
            <div>Page ${state.page} / ${Math.max(pages, 1)} · ${total} résultat(s)</div>
            <div class="flex gap-2">
              <button class="btn-ghost" id="rh-prev" ${state.page <= 1 ? "disabled" : ""} style="padding:4px 12px;">← Préc.</button>
              <button class="btn-ghost" id="rh-next" ${state.page >= pages ? "disabled" : ""} style="padding:4px 12px;">Suiv. →</button>
            </div>
          </div>`}
      </div>`;

    wire(rows);
  }

  function wire(rows) {
    let t;
    root.querySelector("#rh-search")?.addEventListener("input", (e) => {
      clearTimeout(t);
      t = setTimeout(() => { state.search = e.target.value; state.page = 1; load(); }, 400);
    });
    root.querySelector("#rh-dept")?.addEventListener("change", (e) => { state.departement = e.target.value; state.page = 1; load(); });
    root.querySelector("#rh-statut")?.addEventListener("change", (e) => { state.statut = e.target.value; state.page = 1; load(); });
    root.querySelector("#rh-create")?.addEventListener("click", () => openForm());
    root.querySelector("#rh-prev")?.addEventListener("click", () => { if (state.page > 1) { state.page--; load(); } });
    root.querySelector("#rh-next")?.addEventListener("click", () => { state.page++; load(); });
    root.querySelectorAll("[data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const row = rows.find(r => r.id == id);
        if (btn.getAttribute("data-act") === "edit") openForm(row);
        else confirmDelete({ label: fullName(row || {}), onConfirm: async () => { await api.del(`/api/employes/${id}`); load(); } });
      });
    });
  }

  function openForm(row) {
    const isEdit = !!row;
    const f = row || {
      matricule: "", nom: "", prenom: "", poste: "", departement: "DIVERS",
      email: "", telephone: "", date_embauche: "", salaire_base_fcfa: "",
      statut: "ACTIF", notes: "",
    };

    openModal({
      title: isEdit ? `Modifier ${escapeHtml(f.nom || "")}` : "Nouvel employé",
      bodyHTML: `
        <form id="rh-form" class="flex flex-col gap-3">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Matricule</label><input name="matricule" class="form-input" value="${escapeHtml(f.matricule ?? "")}" /></div>
            <div><label class="form-label">Statut</label>
              <select name="statut" class="form-input">
                ${STATUTS.map(s => `<option value="${s}" ${f.statut === s ? "selected" : ""}>${s}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Nom *</label><input name="nom" class="form-input" value="${escapeHtml(f.nom ?? "")}" required /></div>
            <div><label class="form-label">Prénom</label><input name="prenom" class="form-input" value="${escapeHtml(f.prenom ?? "")}" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Département</label>
              <select name="departement" class="form-input">
                ${DEPARTEMENTS.map(d => `<option value="${d}" ${f.departement === d ? "selected" : ""}>${d}</option>`).join("")}
              </select>
            </div>
            <div><label class="form-label">Poste</label><input name="poste" class="form-input" value="${escapeHtml(f.poste ?? "")}" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Email</label><input name="email" type="email" class="form-input" value="${escapeHtml(f.email ?? "")}" /></div>
            <div><label class="form-label">Téléphone</label><input name="telephone" class="form-input" value="${escapeHtml(f.telephone ?? "")}" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Date embauche</label><input name="date_embauche" type="date" class="form-input" value="${escapeHtml(f.date_embauche ?? "")}" /></div>
            <div><label class="form-label">Salaire base (FCFA)</label><input name="salaire_base_fcfa" type="number" class="form-input" value="${f.salaire_base_fcfa ?? ""}" /></div>
          </div>
          <div><label class="form-label">Notes</label><textarea name="notes" class="form-input" rows="2">${escapeHtml(f.notes ?? "")}</textarea></div>
          <p id="rh-err" class="form-error" style="display:none;"></p>
        </form>
      `,
      footerHTML: `
        <button class="btn-ghost" data-modal-close>Annuler</button>
        <button class="btn-primary" data-submit>${isEdit ? "Mettre à jour" : "Créer"}</button>
      `,
      onMount: (overlay, close) => {
        overlay.querySelector("[data-submit]").addEventListener("click", async (e) => {
          e.preventDefault();
          const fd = new FormData(overlay.querySelector("#rh-form"));
          const body = {};
          fd.forEach((v, k) => body[k] = v === "" ? null : v);
          if (body.salaire_base_fcfa != null) body.salaire_base_fcfa = parseInt(body.salaire_base_fcfa, 10);
          const err = overlay.querySelector("#rh-err");
          if (!body.nom) { err.textContent = "Le nom est obligatoire."; err.style.display = "block"; return; }
          try {
            if (isEdit) await api.put(`/api/employes/${row.id}`, body);
            else        await api.post("/api/employes/", body);
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
