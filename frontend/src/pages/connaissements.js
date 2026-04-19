import { api } from "../api.js";
import { fmt, escapeHtml } from "../format.js";
import { getQuery, setQuery } from "../router.js";
import { openModal, confirmDelete, statutBadge, ICONS } from "../ui.js";

const MOIS = [
  { num: 1,  label: "Janvier" },  { num: 2,  label: "Février" }, { num: 3,  label: "Mars" },
  { num: 4,  label: "Avril" },    { num: 5,  label: "Mai" },      { num: 6,  label: "Juin" },
  { num: 7,  label: "Juillet" },  { num: 8,  label: "Août" },     { num: 9,  label: "Septembre" },
  { num: 10, label: "Octobre" }, { num: 11, label: "Novembre" }, { num: 12, label: "Décembre" },
];

const PAGE_SIZE = 20;

export async function renderConnaissements(root) {
  const q = getQuery();
  const state = {
    page: Number(q.page) || 1,
    filters: {
      search:         q.search || "",
      annee:          q.annee || "",
      mois_num:       q.mois_num || "",
      type_operation: q.type_operation || "",
    },
    data: null,
    loading: false,
  };

  async function load() {
    state.loading = true;
    draw();
    try {
      const params = { page: state.page, page_size: PAGE_SIZE, ...cleanFilters(state.filters) };
      state.data = await api.get("/api/connaissements/", { params });
      setQuery({ page: state.page !== 1 ? state.page : "", ...cleanFilters(state.filters) });
    } catch (e) {
      state.data = { items: [], total: 0, pages: 0 };
    } finally {
      state.loading = false;
      draw();
    }
  }

  function cleanFilters(f) {
    const out = {};
    for (const [k, v] of Object.entries(f)) if (v !== "" && v != null) out[k] = v;
    return out;
  }

  function draw() {
    const rows = state.data?.items ?? [];
    const total = state.data?.total ?? 0;
    const pages = state.data?.pages ?? 0;

    root.innerHTML = `
      <div class="app-card flex flex-col gap-4">
        <div class="card-header" style="margin-bottom:0;">
          <div class="card-title">Connaissements</div>
          <div class="flex flex-wrap items-center gap-2.5">
            <input class="filter-select" style="width:160px;" data-f="search" placeholder="N° B/L…" value="${escapeHtml(state.filters.search)}" />
            <input class="filter-select" style="width:90px;" data-f="annee" type="number" placeholder="Année" value="${escapeHtml(state.filters.annee)}" />
            <select class="filter-select" data-f="mois_num">
              <option value="">Tous les mois</option>
              ${MOIS.map(m => `<option value="${m.num}" ${state.filters.mois_num == m.num ? "selected" : ""}>${m.label}</option>`).join("")}
            </select>
            <select class="filter-select" data-f="type_operation">
              <option value="">Import &amp; Export</option>
              <option value="IMPORT" ${state.filters.type_operation === "IMPORT" ? "selected" : ""}>Import</option>
              <option value="EXPORT" ${state.filters.type_operation === "EXPORT" ? "selected" : ""}>Export</option>
            </select>
            <span class="card-badge">${total} B/L</span>
            <button class="btn-primary" data-action="create" style="padding:6px 14px;">+ Nouveau B/L</button>
          </div>
        </div>

        ${state.loading ? `<div style="padding:32px; text-align:center; color:var(--text3);">Chargement…</div>`
          : rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucun connaissement</div>`
          : `
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>N° B/L</th><th>Année</th><th>Mois</th><th>Type</th>
                <th>Quantité</th><th>Poids (kg)</th><th>CA (FCFA)</th><th>Marge</th><th>Tx. marge</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td><span style="font-family:'DM Mono',monospace; font-size:11px; color:var(--gold2);">${escapeHtml(r.numero_bl ?? "—")}</span></td>
                  <td>${r.annee ?? "—"}</td>
                  <td>${escapeHtml(r.mois ?? "—")}</td>
                  <td>${statutBadge(r.type_operation)}</td>
                  <td>${escapeHtml(r.quantite ?? "—")}</td>
                  <td>${fmt.number(r.poids_kg)}</td>
                  <td class="gold-text">${fmt.fcfa(r.docs_fees_fcfa)}</td>
                  <td style="color:${(r.marge_fcfa ?? 0) < 0 ? "var(--red)" : "var(--green)"};">${fmt.fcfa(r.marge_fcfa)}</td>
                  <td style="font-family:'DM Mono',monospace;">${fmt.percent(r.taux_marge)}</td>
                  <td style="text-align:right;">
                    <button class="btn-icon" data-action="edit" data-id="${r.id}" title="Modifier">${ICONS.edit}</button>
                    <button class="btn-icon danger" data-action="delete" data-id="${r.id}" title="Supprimer">${ICONS.trash}</button>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
          <div class="flex items-center justify-between px-2 py-3" style="color:var(--text3); font-size:12px;">
            <div>Page ${state.page} / ${Math.max(pages, 1)} · ${total} résultat(s)</div>
            <div class="flex gap-2">
              <button class="btn-ghost" data-action="prev" ${state.page <= 1 ? "disabled" : ""} style="padding:4px 12px;">← Préc.</button>
              <button class="btn-ghost" data-action="next" ${state.page >= pages ? "disabled" : ""} style="padding:4px 12px;">Suiv. →</button>
            </div>
          </div>`}
      </div>`;

    wireEvents(rows);
  }

  function wireEvents(rows) {
    root.querySelectorAll("[data-f]").forEach(el => {
      el.addEventListener("change", () => applyFilter(el));
      if (el.tagName === "INPUT") el.addEventListener("input", debounce(() => applyFilter(el), 400));
    });
    root.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = btn.getAttribute("data-action");
        const id  = btn.getAttribute("data-id");
        if (act === "create") openForm();
        else if (act === "edit") openForm(rows.find(r => r.id == id));
        else if (act === "delete") {
          const row = rows.find(r => r.id == id);
          confirmDelete({
            label: row?.numero_bl ?? `B/L #${id}`,
            onConfirm: async () => { await api.del(`/api/connaissements/${id}`); load(); },
          });
        }
        else if (act === "prev" && state.page > 1) { state.page--; load(); }
        else if (act === "next") { state.page++; load(); }
      });
    });
  }

  function applyFilter(el) {
    const key = el.getAttribute("data-f");
    state.filters[key] = el.value;
    state.page = 1;
    load();
  }

  function openForm(row) {
    const isEdit = !!row;
    const form = row ? { ...row } : {
      numero_bl: "", annee: new Date().getFullYear(), mois_num: "", type_operation: "IMPORT",
      navire_id: "", shipper_id: "", client_id: "", quantite: "",
      poids_kg: "", volume_m3: "", docs_fees_fcfa: "", montant_normal_fcfa: "",
      marge_fcfa: "", taux_marge: "", notes: "",
    };

    openModal({
      title: isEdit ? "Modifier le B/L" : "Nouveau connaissement",
      bodyHTML: `
        <form id="bl-form" class="flex flex-col gap-3">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">N° B/L</label><input name="numero_bl" class="form-input" value="${escapeHtml(form.numero_bl ?? "")}" placeholder="TXXX-0000" /></div>
            <div><label class="form-label">Type</label>
              <select name="type_operation" class="form-input">
                <option value="IMPORT" ${form.type_operation === "IMPORT" ? "selected" : ""}>Import</option>
                <option value="EXPORT" ${form.type_operation === "EXPORT" ? "selected" : ""}>Export</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Année *</label><input name="annee" class="form-input" type="number" min="2019" max="2030" value="${form.annee ?? ""}" required /></div>
            <div><label class="form-label">Mois</label>
              <select name="mois_num" class="form-input">
                <option value="">— Sélectionner —</option>
                ${MOIS.map(m => `<option value="${m.num}" ${form.mois_num == m.num ? "selected" : ""}>${m.label}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div><label class="form-label">Quantité</label><input name="quantite" class="form-input" value="${escapeHtml(form.quantite ?? "")}" placeholder="Ex : 5 CBM" /></div>
            <div><label class="form-label">Poids (kg)</label><input name="poids_kg" class="form-input" type="number" step="0.01" value="${form.poids_kg ?? ""}" /></div>
            <div><label class="form-label">Volume (m³)</label><input name="volume_m3" class="form-input" type="number" step="0.01" value="${form.volume_m3 ?? ""}" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">CA / Docs fees</label><input name="docs_fees_fcfa" class="form-input" type="number" value="${form.docs_fees_fcfa ?? ""}" /></div>
            <div><label class="form-label">Montant normal</label><input name="montant_normal_fcfa" class="form-input" type="number" value="${form.montant_normal_fcfa ?? ""}" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Marge (FCFA) <span style="opacity:.6;font-weight:400;">(auto)</span></label><input name="marge_fcfa" class="form-input" type="number" value="${form.marge_fcfa ?? ""}" readonly tabindex="-1" style="background:var(--surface-muted,#f3f4f6);" /></div>
            <div><label class="form-label">Taux de marge <span style="opacity:.6;font-weight:400;">(auto)</span></label><input name="taux_marge" class="form-input" type="number" step="0.0001" value="${form.taux_marge ?? ""}" readonly tabindex="-1" style="background:var(--surface-muted,#f3f4f6);" /></div>
          </div>
          <div><label class="form-label">Notes</label><textarea name="notes" class="form-input" rows="3">${escapeHtml(form.notes ?? "")}</textarea></div>
          <p id="bl-err" class="form-error" style="display:none;"></p>
        </form>
      `,
      footerHTML: `
        <button class="btn-ghost" data-modal-close>Annuler</button>
        <button class="btn-primary" data-submit>${isEdit ? "Mettre à jour" : "Créer"}</button>
      `,
      onMount: (overlay, close) => {
        const submit = overlay.querySelector("[data-submit]");
        const formEl = overlay.querySelector("#bl-form");
        const errEl  = overlay.querySelector("#bl-err");

        const docsInput = formEl.querySelector('[name="docs_fees_fcfa"]');
        const mnInput   = formEl.querySelector('[name="montant_normal_fcfa"]');
        const margeInput = formEl.querySelector('[name="marge_fcfa"]');
        const tauxInput  = formEl.querySelector('[name="taux_marge"]');
        const recalcMarge = () => {
          const docs = docsInput.value === "" ? null : Number(docsInput.value);
          const mn   = mnInput.value === ""   ? null : Number(mnInput.value);
          if (docs == null || mn == null || Number.isNaN(docs) || Number.isNaN(mn)) {
            margeInput.value = "";
            tauxInput.value = "";
            return;
          }
          const marge = docs - mn;
          margeInput.value = marge;
          tauxInput.value = mn ? Math.round((marge / mn) * 10000) / 10000 : "";
        };
        docsInput.addEventListener("input", recalcMarge);
        mnInput.addEventListener("input", recalcMarge);

        submit.addEventListener("click", async (e) => {
          e.preventDefault();
          const fd = new FormData(formEl);
          const body = {};
          fd.forEach((v, k) => body[k] = v === "" ? null : v);
          if (!body.annee) { errEl.textContent = "L'année est obligatoire."; errEl.style.display = "block"; return; }

          const mois = MOIS.find(m => m.num == body.mois_num)?.label ?? null;
          const payload = {
            ...body,
            annee: Number(body.annee),
            mois,
            mois_num: body.mois_num ? Number(body.mois_num) : null,
            poids_kg: body.poids_kg ? Number(body.poids_kg) : null,
            volume_m3: body.volume_m3 ? Number(body.volume_m3) : null,
            docs_fees_fcfa: body.docs_fees_fcfa ? Number(body.docs_fees_fcfa) : null,
            montant_normal_fcfa: body.montant_normal_fcfa ? Number(body.montant_normal_fcfa) : null,
            marge_fcfa: body.marge_fcfa ? Number(body.marge_fcfa) : null,
            taux_marge: body.taux_marge ? Number(body.taux_marge) : null,
          };

          submit.disabled = true;
          submit.textContent = "Enregistrement…";
          try {
            if (isEdit) await api.put(`/api/connaissements/${row.id}`, payload);
            else        await api.post("/api/connaissements/", payload);
            close();
            load();
          } catch (err) {
            errEl.textContent = err.data?.detail || err.message || "Erreur lors de l'enregistrement.";
            errEl.style.display = "block";
            submit.disabled = false;
            submit.textContent = isEdit ? "Mettre à jour" : "Créer";
          }
        });
      },
    });
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  load();
}
