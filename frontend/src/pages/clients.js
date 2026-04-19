import { api } from "../api.js";
import { escapeHtml } from "../format.js";
import { getQuery, setQuery } from "../router.js";
import { openModal, confirmDelete, ICONS } from "../ui.js";

const PAGE_SIZE = 20;

export async function renderClients(root) {
  const q = getQuery();
  const state = { page: Number(q.page) || 1, search: q.search || "", data: null, loading: false };

  async function load() {
    state.loading = true;
    draw();
    try {
      const params = { page: state.page, page_size: PAGE_SIZE };
      if (state.search) params.search = state.search;
      state.data = await api.get("/api/clients/", { params });
      setQuery({ page: state.page !== 1 ? state.page : "", search: state.search });
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
          <div class="card-title">Clients / Consignataires</div>
          <div class="flex flex-wrap items-center gap-2.5">
            <input class="filter-select" style="width:200px;" id="cl-search" placeholder="Rechercher un nom…" value="${escapeHtml(state.search)}" />
            <span class="card-badge">${total} client(s)</span>
            <button class="btn-primary" id="cl-create" style="padding:6px 14px;">+ Nouveau client</button>
          </div>
        </div>

        ${state.loading ? `<div style="padding:32px; text-align:center; color:var(--text3);">Chargement…</div>`
          : rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucun client</div>`
          : `
          <table class="data-table w-full">
            <thead><tr><th>Nom</th><th>Secteur</th><th>Pays</th><th>Email</th><th>Téléphone</th><th style="text-align:right;">Actions</th></tr></thead>
            <tbody>
              ${rows.map(c => `
                <tr>
                  <td style="color:var(--text); font-weight:500;">${escapeHtml(c.nom)}</td>
                  <td>${escapeHtml(c.secteur ?? "—")}</td>
                  <td>${escapeHtml(c.pays ?? "—")}</td>
                  <td style="font-family:'DM Mono',monospace; font-size:11px;">${escapeHtml(c.email ?? "—")}</td>
                  <td style="font-family:'DM Mono',monospace; font-size:11px;">${escapeHtml(c.telephone ?? "—")}</td>
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
              <button class="btn-ghost" id="cl-prev" ${state.page <= 1 ? "disabled" : ""} style="padding:4px 12px;">← Préc.</button>
              <button class="btn-ghost" id="cl-next" ${state.page >= pages ? "disabled" : ""} style="padding:4px 12px;">Suiv. →</button>
            </div>
          </div>`}
      </div>`;

    wire(rows);
  }

  function wire(rows) {
    const search = root.querySelector("#cl-search");
    let t;
    search?.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => { state.search = search.value; state.page = 1; load(); }, 400);
    });
    root.querySelector("#cl-create")?.addEventListener("click", () => openForm());
    root.querySelector("#cl-prev")?.addEventListener("click", () => { if (state.page > 1) { state.page--; load(); } });
    root.querySelector("#cl-next")?.addEventListener("click", () => { state.page++; load(); });
    root.querySelectorAll("[data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const row = rows.find(r => r.id == id);
        if (btn.getAttribute("data-act") === "edit") openForm(row);
        else confirmDelete({ label: row?.nom, onConfirm: async () => { await api.del(`/api/clients/${id}`); load(); } });
      });
    });
  }

  function openForm(row) {
    const isEdit = !!row;
    const f = row || { nom: "", secteur: "", pays: "", email: "", telephone: "" };

    openModal({
      title: isEdit ? "Modifier le client" : "Nouveau client",
      bodyHTML: `
        <form id="cl-form" class="flex flex-col gap-3">
          <div><label class="form-label">Nom *</label><input name="nom" class="form-input" value="${escapeHtml(f.nom ?? "")}" required /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Secteur</label><input name="secteur" class="form-input" value="${escapeHtml(f.secteur ?? "")}" /></div>
            <div><label class="form-label">Pays</label><input name="pays" class="form-input" value="${escapeHtml(f.pays ?? "")}" /></div>
          </div>
          <div><label class="form-label">Email</label><input name="email" class="form-input" type="email" value="${escapeHtml(f.email ?? "")}" /></div>
          <div><label class="form-label">Téléphone</label><input name="telephone" class="form-input" value="${escapeHtml(f.telephone ?? "")}" /></div>
          <p id="cl-err" class="form-error" style="display:none;"></p>
        </form>
      `,
      footerHTML: `
        <button class="btn-ghost" data-modal-close>Annuler</button>
        <button class="btn-primary" data-submit>${isEdit ? "Mettre à jour" : "Créer"}</button>
      `,
      onMount: (overlay, close) => {
        overlay.querySelector("[data-submit]").addEventListener("click", async (e) => {
          e.preventDefault();
          const fd = new FormData(overlay.querySelector("#cl-form"));
          const body = {};
          fd.forEach((v, k) => body[k] = v === "" ? null : v);
          const err = overlay.querySelector("#cl-err");
          if (!body.nom) { err.textContent = "Le nom est obligatoire."; err.style.display = "block"; return; }
          try {
            if (isEdit) await api.put(`/api/clients/${row.id}`, body);
            else        await api.post("/api/clients/", body);
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
