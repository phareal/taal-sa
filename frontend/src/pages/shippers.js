import { api } from "../api.js";
import { fmt, escapeHtml } from "../format.js";
import { getQuery, setQuery } from "../router.js";
import { openModal, confirmDelete, statutBadge, ICONS } from "../ui.js";

const PAGE_SIZE = 20;

export async function renderShippers(root) {
  const q = getQuery();
  const state = {
    page: Number(q.page) || 1,
    search: q.search || "",
    statut: q.statut || "",
    data: null, loading: false,
  };

  async function load() {
    state.loading = true; draw();
    try {
      const params = { page: state.page, page_size: PAGE_SIZE };
      if (state.search) params.search = state.search;
      if (state.statut) params.statut = state.statut;
      state.data = await api.get("/api/shippers/", { params });
      setQuery({ page: state.page !== 1 ? state.page : "", search: state.search, statut: state.statut });
    } catch (_) {
      state.data = { items: [], total: 0, pages: 0 };
    } finally {
      state.loading = false; draw();
    }
  }

  function draw() {
    const rows = state.data?.items ?? [];
    const total = state.data?.total ?? 0;
    const pages = state.data?.pages ?? 0;

    root.innerHTML = `
      <div class="app-card flex flex-col gap-4">
        <div class="card-header" style="margin-bottom:0;">
          <div class="card-title">Shippers — Expéditeurs</div>
          <div class="flex flex-wrap items-center gap-2.5">
            <input class="filter-select" style="width:200px;" id="sh-search" placeholder="Rechercher…" value="${escapeHtml(state.search)}" />
            <select class="filter-select" id="sh-statut">
              <option value="">Tous statuts</option>
              <option value="ACTIF" ${state.statut === "ACTIF" ? "selected" : ""}>Actif</option>
              <option value="EN_DÉCLIN" ${state.statut === "EN_DÉCLIN" ? "selected" : ""}>En déclin</option>
              <option value="PERDU" ${state.statut === "PERDU" ? "selected" : ""}>Perdu</option>
            </select>
            <span class="card-badge">${total} shipper(s)</span>
            <button class="btn-primary" id="sh-create" style="padding:6px 14px;">+ Nouveau shipper</button>
          </div>
        </div>

        ${state.loading ? `<div style="padding:32px; text-align:center; color:var(--text3);">Chargement…</div>`
          : rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucun shipper</div>`
          : `
          <table class="data-table w-full">
            <thead><tr><th>Nom</th><th>Pays</th><th>Statut</th><th>CA actuel</th><th>CA passé</th><th>B/L actuel</th><th style="text-align:right;">Actions</th></tr></thead>
            <tbody>
              ${rows.map(s => `
                <tr>
                  <td style="color:var(--text); font-weight:500;">${escapeHtml(s.nom)}</td>
                  <td>${escapeHtml(s.pays ?? "—")}</td>
                  <td>${statutBadge(s.statut)}</td>
                  <td class="gold-text">${fmt.fcfa(s.ca_actuel_fcfa)}</td>
                  <td style="color:var(--text3);">${fmt.fcfa(s.ca_passe_fcfa)}</td>
                  <td>${s.nb_bl_actuel ?? 0}</td>
                  <td style="text-align:right;">
                    <button class="btn-icon" data-act="edit" data-id="${s.id}">${ICONS.edit}</button>
                    <button class="btn-icon danger" data-act="del" data-id="${s.id}">${ICONS.trash}</button>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
          <div class="flex items-center justify-between px-2 py-3" style="color:var(--text3); font-size:12px;">
            <div>Page ${state.page} / ${Math.max(pages, 1)} · ${total} résultat(s)</div>
            <div class="flex gap-2">
              <button class="btn-ghost" id="sh-prev" ${state.page <= 1 ? "disabled" : ""} style="padding:4px 12px;">← Préc.</button>
              <button class="btn-ghost" id="sh-next" ${state.page >= pages ? "disabled" : ""} style="padding:4px 12px;">Suiv. →</button>
            </div>
          </div>`}
      </div>`;

    wire(rows);
  }

  function wire(rows) {
    let t;
    root.querySelector("#sh-search")?.addEventListener("input", (e) => {
      clearTimeout(t);
      t = setTimeout(() => { state.search = e.target.value; state.page = 1; load(); }, 400);
    });
    root.querySelector("#sh-statut")?.addEventListener("change", (e) => { state.statut = e.target.value; state.page = 1; load(); });
    root.querySelector("#sh-create")?.addEventListener("click", () => openForm());
    root.querySelector("#sh-prev")?.addEventListener("click", () => { if (state.page > 1) { state.page--; load(); } });
    root.querySelector("#sh-next")?.addEventListener("click", () => { state.page++; load(); });
    root.querySelectorAll("[data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const row = rows.find(r => r.id == id);
        if (btn.getAttribute("data-act") === "edit") openForm(row);
        else confirmDelete({ label: row?.nom, onConfirm: async () => { await api.del(`/api/shippers/${id}`); load(); } });
      });
    });
  }

  function openForm(row) {
    const isEdit = !!row;
    const f = row || { nom: "", pays: "", statut: "ACTIF", ca_actuel_fcfa: "", ca_passe_fcfa: "", nb_bl_actuel: "", nb_bl_passe: "" };

    openModal({
      title: isEdit ? "Modifier le shipper" : "Nouveau shipper",
      bodyHTML: `
        <form id="sh-form" class="flex flex-col gap-3">
          <div><label class="form-label">Nom *</label><input name="nom" class="form-input" value="${escapeHtml(f.nom ?? "")}" required /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Pays</label><input name="pays" class="form-input" value="${escapeHtml(f.pays ?? "")}" /></div>
            <div><label class="form-label">Statut</label>
              <select name="statut" class="form-input">
                <option value="ACTIF"      ${f.statut === "ACTIF" ? "selected" : ""}>Actif</option>
                <option value="EN_DÉCLIN"  ${f.statut === "EN_DÉCLIN" ? "selected" : ""}>En déclin</option>
                <option value="PERDU"      ${f.statut === "PERDU" ? "selected" : ""}>Perdu</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">CA actuel (FCFA)</label><input name="ca_actuel_fcfa" class="form-input" type="number" value="${f.ca_actuel_fcfa ?? ""}" /></div>
            <div><label class="form-label">CA passé (FCFA)</label><input name="ca_passe_fcfa" class="form-input" type="number" value="${f.ca_passe_fcfa ?? ""}" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">B/L actuel</label><input name="nb_bl_actuel" class="form-input" type="number" value="${f.nb_bl_actuel ?? ""}" /></div>
            <div><label class="form-label">B/L passé</label><input name="nb_bl_passe" class="form-input" type="number" value="${f.nb_bl_passe ?? ""}" /></div>
          </div>
          <p id="sh-err" class="form-error" style="display:none;"></p>
        </form>
      `,
      footerHTML: `
        <button class="btn-ghost" data-modal-close>Annuler</button>
        <button class="btn-primary" data-submit>${isEdit ? "Mettre à jour" : "Créer"}</button>
      `,
      onMount: (overlay, close) => {
        overlay.querySelector("[data-submit]").addEventListener("click", async (e) => {
          e.preventDefault();
          const fd = new FormData(overlay.querySelector("#sh-form"));
          const body = {};
          fd.forEach((v, k) => body[k] = v === "" ? null : v);
          ["ca_actuel_fcfa", "ca_passe_fcfa", "nb_bl_actuel", "nb_bl_passe"].forEach(k => {
            if (body[k] != null) body[k] = Number(body[k]);
          });
          const err = overlay.querySelector("#sh-err");
          if (!body.nom) { err.textContent = "Le nom est obligatoire."; err.style.display = "block"; return; }
          try {
            if (isEdit) await api.put(`/api/shippers/${row.id}`, body);
            else        await api.post("/api/shippers/", body);
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
