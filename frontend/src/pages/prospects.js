import { api } from "../api.js";
import { fmt, escapeHtml } from "../format.js";
import { getQuery, setQuery } from "../router.js";
import { openModal, confirmDelete, statutBadge, ICONS } from "../ui.js";

const PAGE_SIZE = 20;
const PRIORITES = ["P1", "P2", "P3"];
const STATUTS_RELANCE = ["À RELANCER", "RELANCÉ", "EN ATTENTE"];

let CLIENTS_CACHE = null;
async function loadClients() {
  if (CLIENTS_CACHE) return CLIENTS_CACHE;
  try {
    const data = await api.get("/api/clients/", { params: { page: 1, page_size: 500 } });
    CLIENTS_CACHE = data.items ?? [];
  } catch (_) { CLIENTS_CACHE = []; }
  return CLIENTS_CACHE;
}

export async function renderProspects(root) {
  const q = getQuery();
  const state = {
    page: Number(q.page) || 1,
    priorite: q.priorite || "",
    statut_relance: q.statut_relance || "",
    data: null, loading: false,
  };

  async function load() {
    state.loading = true; draw();
    try {
      const params = { page: state.page, page_size: PAGE_SIZE };
      if (state.priorite) params.priorite = state.priorite;
      if (state.statut_relance) params.statut_relance = state.statut_relance;
      state.data = await api.get("/api/prospects/", { params });
      setQuery({ page: state.page !== 1 ? state.page : "", priorite: state.priorite, statut_relance: state.statut_relance });
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
          <div class="card-title">Prospection Commerciale</div>
          <div class="flex flex-wrap items-center gap-2.5">
            <select class="filter-select" id="pr-priorite">
              <option value="">Toutes priorités</option>
              ${PRIORITES.map(p => `<option value="${p}" ${state.priorite === p ? "selected" : ""}>${p}</option>`).join("")}
            </select>
            <select class="filter-select" id="pr-statut">
              <option value="">Tous statuts</option>
              ${STATUTS_RELANCE.map(s => `<option value="${s}" ${state.statut_relance === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
            <span class="card-badge">${total} prospect(s)</span>
            <button class="btn-primary" id="pr-create" style="padding:6px 14px;">+ Nouveau prospect</button>
          </div>
        </div>
        ${state.loading ? `<div style="padding:32px; text-align:center; color:var(--text3);">Chargement…</div>`
          : rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucun prospect</div>`
          : `
          <table class="data-table w-full">
            <thead><tr><th>Client</th><th>Type</th><th>Priorité</th><th>CA pic</th><th>Dernière op.</th><th>Action prévue</th><th>Relance</th><th style="text-align:right;">Actions</th></tr></thead>
            <tbody>
              ${rows.map(p => `
                <tr>
                  <td style="color:var(--text); font-weight:500;">${escapeHtml(p.client_nom ?? p.client?.nom ?? `#${p.client_id}`)}</td>
                  <td>${escapeHtml(p.type_statut ?? "—")}</td>
                  <td>${statutBadge(p.priorite)}</td>
                  <td class="gold-text">${fmt.fcfa(p.ca_pic_fcfa)}</td>
                  <td>${p.annee_derniere_op ?? "—"}</td>
                  <td style="color:var(--text2);">${escapeHtml(p.action_prevue ?? "—")}</td>
                  <td>${statutBadge(p.statut_relance)}</td>
                  <td style="text-align:right;">
                    <button class="btn-icon" data-act="edit" data-id="${p.id}">${ICONS.edit}</button>
                    <button class="btn-icon danger" data-act="del" data-id="${p.id}">${ICONS.trash}</button>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
          <div class="flex items-center justify-between px-2 py-3" style="color:var(--text3); font-size:12px;">
            <div>Page ${state.page} / ${Math.max(pages, 1)} · ${total} résultat(s)</div>
            <div class="flex gap-2">
              <button class="btn-ghost" id="pr-prev" ${state.page <= 1 ? "disabled" : ""} style="padding:4px 12px;">← Préc.</button>
              <button class="btn-ghost" id="pr-next" ${state.page >= pages ? "disabled" : ""} style="padding:4px 12px;">Suiv. →</button>
            </div>
          </div>`}
      </div>`;

    wire(rows);
  }

  function wire(rows) {
    root.querySelector("#pr-priorite")?.addEventListener("change", (e) => { state.priorite = e.target.value; state.page = 1; load(); });
    root.querySelector("#pr-statut")?.addEventListener("change", (e) => { state.statut_relance = e.target.value; state.page = 1; load(); });
    root.querySelector("#pr-create")?.addEventListener("click", () => openForm());
    root.querySelector("#pr-prev")?.addEventListener("click", () => { if (state.page > 1) { state.page--; load(); } });
    root.querySelector("#pr-next")?.addEventListener("click", () => { state.page++; load(); });
    root.querySelectorAll("[data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const row = rows.find(r => r.id == id);
        if (btn.getAttribute("data-act") === "edit") openForm(row);
        else confirmDelete({ label: row?.client_nom || `#${row?.client_id}`, onConfirm: async () => { await api.del(`/api/prospects/${id}`); load(); } });
      });
    });
  }

  async function openForm(row) {
    const isEdit = !!row;
    const clients = await loadClients();
    const f = row || {
      client_id: "", type_statut: "", priorite: "P3", ca_pic_fcfa: "",
      ca_derniere_fcfa: "", annee_derniere_op: "", action_prevue: "",
      date_relance: "", statut_relance: "À RELANCER", notes: "",
    };

    openModal({
      title: isEdit ? "Modifier le prospect" : "Nouveau prospect",
      bodyHTML: `
        <form id="pr-form" class="flex flex-col gap-3">
          <div><label class="form-label">Client *</label>
            <select name="client_id" class="form-input" ${isEdit ? "disabled" : ""} required>
              <option value="">— Sélectionner —</option>
              ${clients.map(c => `<option value="${c.id}" ${String(f.client_id) === String(c.id) ? "selected" : ""}>${escapeHtml(c.nom)}</option>`).join("")}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Type statut</label><input name="type_statut" class="form-input" value="${escapeHtml(f.type_statut ?? "")}" /></div>
            <div><label class="form-label">Priorité</label>
              <select name="priorite" class="form-input">
                ${PRIORITES.map(p => `<option value="${p}" ${f.priorite === p ? "selected" : ""}>${p}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">CA pic (FCFA)</label><input name="ca_pic_fcfa" type="number" class="form-input" value="${f.ca_pic_fcfa ?? ""}" /></div>
            <div><label class="form-label">CA dernière (FCFA)</label><input name="ca_derniere_fcfa" type="number" class="form-input" value="${f.ca_derniere_fcfa ?? ""}" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Année dernière op.</label><input name="annee_derniere_op" type="number" class="form-input" value="${f.annee_derniere_op ?? ""}" /></div>
            <div><label class="form-label">Date relance</label><input name="date_relance" type="date" class="form-input" value="${escapeHtml(f.date_relance ?? "")}" /></div>
          </div>
          <div><label class="form-label">Statut relance</label>
            <select name="statut_relance" class="form-input">
              ${STATUTS_RELANCE.map(s => `<option value="${s}" ${f.statut_relance === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </div>
          <div><label class="form-label">Action prévue</label><input name="action_prevue" class="form-input" value="${escapeHtml(f.action_prevue ?? "")}" /></div>
          <div><label class="form-label">Notes</label><textarea name="notes" class="form-input" rows="2">${escapeHtml(f.notes ?? "")}</textarea></div>
          <p id="pr-err" class="form-error" style="display:none;"></p>
        </form>
      `,
      footerHTML: `
        <button class="btn-ghost" data-modal-close>Annuler</button>
        <button class="btn-primary" data-submit>${isEdit ? "Mettre à jour" : "Créer"}</button>
      `,
      onMount: (overlay, close) => {
        overlay.querySelector("[data-submit]").addEventListener("click", async (e) => {
          e.preventDefault();
          const fd = new FormData(overlay.querySelector("#pr-form"));
          const body = {};
          fd.forEach((v, k) => body[k] = v === "" ? null : v);
          ["client_id", "ca_pic_fcfa", "ca_derniere_fcfa", "annee_derniere_op"].forEach(k => {
            if (body[k] != null) body[k] = parseInt(body[k], 10);
          });
          const err = overlay.querySelector("#pr-err");
          if (!isEdit && !body.client_id) { err.textContent = "Le client est obligatoire."; err.style.display = "block"; return; }
          if (isEdit) delete body.client_id;
          try {
            if (isEdit) await api.put(`/api/prospects/${row.id}`, body);
            else        await api.post("/api/prospects/", body);
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
