import { api } from "../api.js";
import { escapeHtml } from "../format.js";
import { getQuery, setQuery } from "../router.js";
import { openModal, confirmDelete, ICONS } from "../ui.js";

const PAGE_SIZE = 20;

export async function renderNavires(root) {
  const q = getQuery();
  const state = {
    page: Number(q.page) || 1,
    search: q.search || "",
    actif: q.actif || "",
    data: null,
    loading: false,
  };

  async function load() {
    state.loading = true;
    draw();
    try {
      const params = { page: state.page, page_size: PAGE_SIZE };
      if (state.search) params.search = state.search;
      if (state.actif !== "") params.actif = state.actif;
      state.data = await api.get("/api/navires/", { params });
      setQuery({
        page: state.page !== 1 ? state.page : "",
        search: state.search,
        actif: state.actif,
      });
    } catch (_) {
      state.data = { items: [], total: 0, pages: 0 };
    } finally {
      state.loading = false;
      draw();
    }
  }

  function draw() {
    const rows = state.data?.items ?? [];
    const total = state.data?.total ?? 0;
    const pages = state.data?.pages ?? 0;

    root.innerHTML = `
      <div class="app-card flex flex-col gap-4">
        <div class="card-header" style="margin-bottom:0;">
          <div class="card-title">Navires</div>
          <div class="flex flex-wrap items-center gap-2.5">
            <input class="filter-select" style="width:200px;" id="nv-search" placeholder="Rechercher un navire…" value="${escapeHtml(state.search)}" />
            <select class="filter-select" id="nv-actif">
              <option value="" ${state.actif === "" ? "selected" : ""}>Tous</option>
              <option value="true" ${state.actif === "true" ? "selected" : ""}>Actifs</option>
              <option value="false" ${state.actif === "false" ? "selected" : ""}>Inactifs</option>
            </select>
            <span class="card-badge">${total} navire(s)</span>
            <button class="btn-primary" id="nv-create" style="padding:6px 14px;">+ Nouveau navire</button>
          </div>
        </div>

        ${state.loading ? `<div style="padding:32px; text-align:center; color:var(--text3);">Chargement…</div>`
          : rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucun navire</div>`
          : `
          <table class="data-table w-full">
            <thead><tr><th>Nom</th><th>Compagnie</th><th>Code ligne</th><th>Statut</th><th style="text-align:right;">Actions</th></tr></thead>
            <tbody>
              ${rows.map(n => `
                <tr>
                  <td style="color:var(--text); font-weight:500;">${escapeHtml(n.nom)}</td>
                  <td>${escapeHtml(n.compagnie ?? "—")}</td>
                  <td style="font-family:'DM Mono',monospace; font-size:11px;">${escapeHtml(n.code_ligne ?? "—")}</td>
                  <td>
                    <span class="tag ${n.actif ? "tag-green" : "tag-red"}">${n.actif ? "ACTIF" : "INACTIF"}</span>
                  </td>
                  <td style="text-align:right;">
                    <button class="btn-icon" data-act="edit" data-id="${n.id}">${ICONS.edit}</button>
                    <button class="btn-icon danger" data-act="del" data-id="${n.id}">${ICONS.trash}</button>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
          <div class="flex items-center justify-between px-2 py-3" style="color:var(--text3); font-size:12px;">
            <div>Page ${state.page} / ${Math.max(pages, 1)} · ${total} résultat(s)</div>
            <div class="flex gap-2">
              <button class="btn-ghost" id="nv-prev" ${state.page <= 1 ? "disabled" : ""} style="padding:4px 12px;">← Préc.</button>
              <button class="btn-ghost" id="nv-next" ${state.page >= pages ? "disabled" : ""} style="padding:4px 12px;">Suiv. →</button>
            </div>
          </div>`}
      </div>`;

    wire(rows);
  }

  function wire(rows) {
    const search = root.querySelector("#nv-search");
    let t;
    search?.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => { state.search = search.value; state.page = 1; load(); }, 400);
    });
    root.querySelector("#nv-actif")?.addEventListener("change", (e) => {
      state.actif = e.target.value;
      state.page = 1;
      load();
    });
    root.querySelector("#nv-create")?.addEventListener("click", () => openForm());
    root.querySelector("#nv-prev")?.addEventListener("click", () => { if (state.page > 1) { state.page--; load(); } });
    root.querySelector("#nv-next")?.addEventListener("click", () => { state.page++; load(); });
    root.querySelectorAll("[data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const row = rows.find(r => r.id == id);
        if (btn.getAttribute("data-act") === "edit") openForm(row);
        else confirmDelete({ label: row?.nom, onConfirm: async () => { await api.del(`/api/navires/${id}`); load(); } });
      });
    });
  }

  function openForm(row) {
    const isEdit = !!row;
    const f = row || { nom: "", compagnie: "", code_ligne: "", actif: true };

    openModal({
      title: isEdit ? "Modifier le navire" : "Nouveau navire",
      bodyHTML: `
        <form id="nv-form" class="flex flex-col gap-3">
          <div><label class="form-label">Nom *</label><input name="nom" class="form-input" value="${escapeHtml(f.nom ?? "")}" required /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Compagnie</label><input name="compagnie" class="form-input" value="${escapeHtml(f.compagnie ?? "")}" /></div>
            <div><label class="form-label">Code ligne</label><input name="code_ligne" class="form-input" value="${escapeHtml(f.code_ligne ?? "")}" /></div>
          </div>
          <label class="flex items-center gap-2" style="font-size:13px; color:var(--text2);">
            <input type="checkbox" name="actif" ${f.actif ? "checked" : ""} /> Actif
          </label>
          <p id="nv-err" class="form-error" style="display:none;"></p>
        </form>
      `,
      footerHTML: `
        <button class="btn-ghost" data-modal-close>Annuler</button>
        <button class="btn-primary" data-submit>${isEdit ? "Mettre à jour" : "Créer"}</button>
      `,
      onMount: (overlay, close) => {
        overlay.querySelector("[data-submit]").addEventListener("click", async (e) => {
          e.preventDefault();
          const formEl = overlay.querySelector("#nv-form");
          const fd = new FormData(formEl);
          const body = {};
          fd.forEach((v, k) => body[k] = v === "" ? null : v);
          body.actif = formEl.querySelector('[name="actif"]').checked;
          const err = overlay.querySelector("#nv-err");
          if (!body.nom) { err.textContent = "Le nom est obligatoire."; err.style.display = "block"; return; }
          try {
            if (isEdit) await api.put(`/api/navires/${row.id}`, body);
            else        await api.post("/api/navires/", body);
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
