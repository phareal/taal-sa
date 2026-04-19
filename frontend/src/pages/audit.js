import { api } from "../api.js";
import { escapeHtml } from "../format.js";
import { getQuery, setQuery } from "../router.js";
import { openModal, confirmDelete, statutBadge, ICONS } from "../ui.js";

const PAGE_SIZE = 20;
const TYPES_AUDIT = ["INTERNE","EXTERNE","FISCAL","SOCIAL","OPERATIONNEL","INFORMATIQUE","QUALITE"];
const STATUTS = ["PLANIFIÉ","EN COURS","TERMINÉ","SUIVI","CLOS"];
const PRIORITES = ["P1","P2","P3"];
const CONFORMITES = ["N/A","CONFORME","NON_CONFORME","PARTIEL"];

export async function renderAudit(root) {
  const q = getQuery();
  const state = {
    page: Number(q.page) || 1,
    type_audit: q.type_audit || "",
    statut: q.statut || "",
    priorite: q.priorite || "",
    conformite: q.conformite || "",
    data: null, loading: false,
  };

  async function load() {
    state.loading = true; draw();
    try {
      const params = { page: state.page, page_size: PAGE_SIZE };
      if (state.type_audit) params.type_audit = state.type_audit;
      if (state.statut) params.statut = state.statut;
      if (state.priorite) params.priorite = state.priorite;
      if (state.conformite) params.conformite = state.conformite;
      state.data = await api.get("/api/audit/", { params });
      setQuery({
        page: state.page !== 1 ? state.page : "",
        type_audit: state.type_audit, statut: state.statut,
        priorite: state.priorite, conformite: state.conformite,
      });
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
          <div class="card-title">Audit &amp; Conformité</div>
          <div class="flex flex-wrap items-center gap-2.5">
            <select class="filter-select" id="au-type">
              <option value="">Tous types</option>
              ${TYPES_AUDIT.map(t => `<option value="${t}" ${state.type_audit === t ? "selected" : ""}>${t}</option>`).join("")}
            </select>
            <select class="filter-select" id="au-statut">
              <option value="">Tous statuts</option>
              ${STATUTS.map(s => `<option value="${s}" ${state.statut === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
            <select class="filter-select" id="au-priorite">
              <option value="">Toutes priorités</option>
              ${PRIORITES.map(p => `<option value="${p}" ${state.priorite === p ? "selected" : ""}>${p}</option>`).join("")}
            </select>
            <span class="card-badge">${total} mission(s)</span>
            <button class="btn-primary" id="au-create" style="padding:6px 14px;">+ Nouvelle mission</button>
          </div>
        </div>
        ${state.loading ? `<div style="padding:32px; text-align:center; color:var(--text3);">Chargement…</div>`
          : rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucune mission d'audit</div>`
          : `
          <table class="data-table w-full">
            <thead><tr><th>Réf.</th><th>Date</th><th>Type</th><th>Domaine</th><th>Auditeur</th><th>Conformité</th><th>Statut</th><th style="text-align:right;">Actions</th></tr></thead>
            <tbody>
              ${rows.map(a => `
                <tr>
                  <td style="font-family:'DM Mono',monospace; color:var(--gold2); font-size:11px;">${escapeHtml(a.reference ?? "—")}</td>
                  <td>${escapeHtml(a.date_audit ?? "—")}</td>
                  <td>${escapeHtml(a.type_audit ?? "—")}</td>
                  <td>${escapeHtml(a.domaine ?? "—")}</td>
                  <td style="color:var(--text3);">${escapeHtml(a.auditeur ?? "—")}</td>
                  <td>${statutBadge(a.conformite)}</td>
                  <td>${statutBadge(a.statut)}</td>
                  <td style="text-align:right;">
                    <button class="btn-icon" data-act="edit" data-id="${a.id}">${ICONS.edit}</button>
                    <button class="btn-icon danger" data-act="del" data-id="${a.id}">${ICONS.trash}</button>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
          <div class="flex items-center justify-between px-2 py-3" style="color:var(--text3); font-size:12px;">
            <div>Page ${state.page} / ${Math.max(pages, 1)} · ${total} résultat(s)</div>
            <div class="flex gap-2">
              <button class="btn-ghost" id="au-prev" ${state.page <= 1 ? "disabled" : ""} style="padding:4px 12px;">← Préc.</button>
              <button class="btn-ghost" id="au-next" ${state.page >= pages ? "disabled" : ""} style="padding:4px 12px;">Suiv. →</button>
            </div>
          </div>`}
      </div>`;

    wire(rows);
  }

  function wire(rows) {
    root.querySelector("#au-type")?.addEventListener("change", (e) => { state.type_audit = e.target.value; state.page = 1; load(); });
    root.querySelector("#au-statut")?.addEventListener("change", (e) => { state.statut = e.target.value; state.page = 1; load(); });
    root.querySelector("#au-priorite")?.addEventListener("change", (e) => { state.priorite = e.target.value; state.page = 1; load(); });
    root.querySelector("#au-create")?.addEventListener("click", () => openForm());
    root.querySelector("#au-prev")?.addEventListener("click", () => { if (state.page > 1) { state.page--; load(); } });
    root.querySelector("#au-next")?.addEventListener("click", () => { state.page++; load(); });
    root.querySelectorAll("[data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const row = rows.find(r => r.id == id);
        if (btn.getAttribute("data-act") === "edit") openForm(row);
        else confirmDelete({ label: row?.reference || `Audit #${id}`, onConfirm: async () => { await api.del(`/api/audit/${id}`); load(); } });
      });
    });
  }

  function openForm(row) {
    const isEdit = !!row;
    const f = row || {
      reference: "", date_audit: new Date().toISOString().slice(0, 10),
      auditeur: "", type_audit: "INTERNE", domaine: "",
      periode_debut: "", periode_fin: "", conformite: "N/A",
      nb_observations: "", observations: "", recommandations: "",
      plan_action: "", statut: "PLANIFIÉ", priorite: "P3", notes: "",
    };

    openModal({
      title: isEdit ? "Modifier la mission" : "Nouvelle mission d'audit",
      bodyHTML: `
        <form id="au-form" class="flex flex-col gap-3">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Référence</label><input name="reference" class="form-input" value="${escapeHtml(f.reference ?? "")}" /></div>
            <div><label class="form-label">Date audit *</label><input name="date_audit" type="date" class="form-input" value="${escapeHtml(f.date_audit ?? "")}" required /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Type</label>
              <select name="type_audit" class="form-input">
                ${TYPES_AUDIT.map(t => `<option value="${t}" ${f.type_audit === t ? "selected" : ""}>${t}</option>`).join("")}
              </select>
            </div>
            <div><label class="form-label">Auditeur</label><input name="auditeur" class="form-input" value="${escapeHtml(f.auditeur ?? "")}" /></div>
          </div>
          <div><label class="form-label">Domaine</label><input name="domaine" class="form-input" value="${escapeHtml(f.domaine ?? "")}" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Période début</label><input name="periode_debut" type="date" class="form-input" value="${escapeHtml(f.periode_debut ?? "")}" /></div>
            <div><label class="form-label">Période fin</label><input name="periode_fin" type="date" class="form-input" value="${escapeHtml(f.periode_fin ?? "")}" /></div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div><label class="form-label">Conformité</label>
              <select name="conformite" class="form-input">
                ${CONFORMITES.map(c => `<option value="${c}" ${f.conformite === c ? "selected" : ""}>${c}</option>`).join("")}
              </select>
            </div>
            <div><label class="form-label">Statut</label>
              <select name="statut" class="form-input">
                ${STATUTS.map(s => `<option value="${s}" ${f.statut === s ? "selected" : ""}>${s}</option>`).join("")}
              </select>
            </div>
            <div><label class="form-label">Priorité</label>
              <select name="priorite" class="form-input">
                ${PRIORITES.map(p => `<option value="${p}" ${f.priorite === p ? "selected" : ""}>${p}</option>`).join("")}
              </select>
            </div>
          </div>
          <div><label class="form-label">Nb observations</label><input name="nb_observations" type="number" class="form-input" value="${f.nb_observations ?? ""}" /></div>
          <div><label class="form-label">Observations</label><textarea name="observations" class="form-input" rows="3">${escapeHtml(f.observations ?? "")}</textarea></div>
          <div><label class="form-label">Recommandations</label><textarea name="recommandations" class="form-input" rows="2">${escapeHtml(f.recommandations ?? "")}</textarea></div>
          <div><label class="form-label">Plan d'action</label><textarea name="plan_action" class="form-input" rows="2">${escapeHtml(f.plan_action ?? "")}</textarea></div>
          <div><label class="form-label">Notes</label><textarea name="notes" class="form-input" rows="2">${escapeHtml(f.notes ?? "")}</textarea></div>
          <p id="au-err" class="form-error" style="display:none;"></p>
        </form>
      `,
      footerHTML: `
        <button class="btn-ghost" data-modal-close>Annuler</button>
        <button class="btn-primary" data-submit>${isEdit ? "Mettre à jour" : "Créer"}</button>
      `,
      onMount: (overlay, close) => {
        overlay.querySelector("[data-submit]").addEventListener("click", async (e) => {
          e.preventDefault();
          const fd = new FormData(overlay.querySelector("#au-form"));
          const body = {};
          fd.forEach((v, k) => body[k] = v === "" ? null : v);
          if (body.nb_observations != null) body.nb_observations = parseInt(body.nb_observations, 10);
          const err = overlay.querySelector("#au-err");
          if (!body.date_audit) { err.textContent = "La date est obligatoire."; err.style.display = "block"; return; }
          try {
            if (isEdit) await api.put(`/api/audit/${row.id}`, body);
            else        await api.post("/api/audit/", body);
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
