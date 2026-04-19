import { api } from "../api.js";
import { escapeHtml } from "../format.js";
import { getQuery, setQuery } from "../router.js";
import { openModal, confirmDelete, statutBadge, ICONS } from "../ui.js";

const PAGE_SIZE = 20;
const TYPES_TC = ["TC20", "TC40", "TC40HC", "TC45", "VRAC", "AUTRE"];
const STATUTS_TC = ["EN COURS", "LIVRÉ", "BLOQUÉ", "EN ATTENTE"];
const MOIS = ["JANVIER","FÉVRIER","MARS","AVRIL","MAI","JUIN","JUILLET","AOÛT","SEPTEMBRE","OCTOBRE","NOVEMBRE","DÉCEMBRE"];

let NAVIRES_CACHE = null;
async function loadNavires() {
  if (NAVIRES_CACHE) return NAVIRES_CACHE;
  try {
    const data = await api.get("/api/navires/", { params: { page: 1, page_size: 200 } });
    NAVIRES_CACHE = data.items ?? [];
  } catch (_) { NAVIRES_CACHE = []; }
  return NAVIRES_CACHE;
}

function openNavireModal(onCreated) {
  let escCapture;
  openModal({
    title: "Nouveau navire",
    onClose: () => {
      if (escCapture) document.removeEventListener("keydown", escCapture, true);
    },
    bodyHTML: `
      <form id="nv-quick-form" class="flex flex-col gap-3">
        <div><label class="form-label">Nom *</label><input name="nom" class="form-input" required autofocus /></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="form-label">Compagnie</label><input name="compagnie" class="form-input" /></div>
          <div><label class="form-label">Code ligne</label><input name="code_ligne" class="form-input" /></div>
        </div>
        <label class="flex items-center gap-2" style="font-size:13px; color:var(--text2);">
          <input type="checkbox" name="actif" checked /> Actif
        </label>
        <p id="nv-quick-err" class="form-error" style="display:none;"></p>
      </form>
    `,
    footerHTML: `
      <button class="btn-ghost" data-modal-close>Annuler</button>
      <button class="btn-primary" data-submit>Créer</button>
    `,
    onMount: (overlay, close) => {
      const formEl = overlay.querySelector("#nv-quick-form");
      const err = overlay.querySelector("#nv-quick-err");
      const submit = overlay.querySelector("[data-submit]");
      const save = async () => {
        const fd = new FormData(formEl);
        const body = {};
        fd.forEach((v, k) => body[k] = v === "" ? null : v);
        body.actif = formEl.querySelector('[name="actif"]').checked;
        if (!body.nom) { err.textContent = "Le nom est obligatoire."; err.style.display = "block"; return; }
        submit.disabled = true;
        try {
          const created = await api.post("/api/navires/", body);
          onCreated?.(created);
          close();
        } catch (e) {
          err.textContent = e.data?.detail || e.message || "Erreur.";
          err.style.display = "block";
          submit.disabled = false;
        }
      };
      submit.addEventListener("click", (e) => { e.preventDefault(); save(); });
      formEl.addEventListener("submit", (e) => { e.preventDefault(); save(); });
      setTimeout(() => formEl.querySelector('[name="nom"]')?.focus(), 30);

      escCapture = (e) => {
        if (e.key === "Escape") { e.stopImmediatePropagation(); close(); }
      };
      document.addEventListener("keydown", escCapture, true);
    },
  });
}

export async function renderGroupage(root) {
  const q = getQuery();
  const state = {
    page: Number(q.page) || 1,
    annee: q.annee || "",
    statut: q.statut || "",
    partenaire: q.partenaire || "",
    data: null, loading: false,
  };

  async function load() {
    state.loading = true; draw();
    try {
      const params = { page: state.page, page_size: PAGE_SIZE };
      if (state.annee) params.annee = state.annee;
      if (state.statut) params.statut = state.statut;
      if (state.partenaire) params.partenaire = state.partenaire;
      const [tcData, _navires] = await Promise.all([
        api.get("/api/conteneurs/", { params }),
        loadNavires(),
      ]);
      state.data = tcData;
      setQuery({ page: state.page !== 1 ? state.page : "", annee: state.annee, statut: state.statut, partenaire: state.partenaire });
    } catch (_) {
      state.data = { items: [], total: 0, pages: 0 };
    } finally { state.loading = false; draw(); }
  }

  function navireName(id) {
    if (id == null) return "—";
    const n = (NAVIRES_CACHE || []).find(x => x.id === id);
    return n?.nom ?? "—";
  }

  function draw() {
    const rows = state.data?.items ?? [];
    const total = state.data?.total ?? 0;
    const pages = state.data?.pages ?? 0;

    root.innerHTML = `
      <div class="app-card flex flex-col gap-4">
        <div class="card-header" style="margin-bottom:0;">
          <div class="card-title">Conteneurs / Groupage</div>
          <div class="flex flex-wrap items-center gap-2.5">
            <input class="filter-select" style="width:140px;" id="gr-partenaire" placeholder="Partenaire…" value="${escapeHtml(state.partenaire)}" />
            <input class="filter-select" style="width:90px;" id="gr-annee" placeholder="Année" type="number" value="${escapeHtml(state.annee)}" />
            <select class="filter-select" id="gr-statut">
              <option value="">Tous statuts</option>
              ${STATUTS_TC.map(s => `<option value="${s}" ${state.statut === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
            <span class="card-badge">${total} conteneur(s)</span>
            <button class="btn-primary" id="gr-create" style="padding:6px 14px;">+ Nouveau TC</button>
          </div>
        </div>
        ${state.loading ? `<div style="padding:32px; text-align:center; color:var(--text3);">Chargement…</div>`
          : rows.length === 0 ? `<div style="padding:32px; text-align:center; color:var(--text3);">Aucun conteneur</div>`
          : `
          <table class="data-table w-full">
            <thead><tr><th>N° TC</th><th>Type</th><th>Navire</th><th>Partenaire</th><th>Année</th><th>Mois</th><th>Date arrivée</th><th>Statut</th><th style="text-align:right;">Actions</th></tr></thead>
            <tbody>
              ${rows.map(c => `
                <tr>
                  <td style="font-family:'DM Mono',monospace; color:var(--gold2); font-size:11px;">${escapeHtml(c.numero_tc ?? "—")}</td>
                  <td>${escapeHtml(c.type_tc ?? "—")}</td>
                  <td>${escapeHtml(navireName(c.navire_id))}</td>
                  <td>${escapeHtml(c.partenaire ?? "—")}</td>
                  <td>${c.annee ?? "—"}</td>
                  <td>${escapeHtml(c.mois ?? (c.mois_num ? MOIS[c.mois_num - 1] : "—"))}</td>
                  <td>${escapeHtml(c.date_arrivee ?? "—")}</td>
                  <td>${statutBadge(c.statut)}</td>
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
              <button class="btn-ghost" id="gr-prev" ${state.page <= 1 ? "disabled" : ""} style="padding:4px 12px;">← Préc.</button>
              <button class="btn-ghost" id="gr-next" ${state.page >= pages ? "disabled" : ""} style="padding:4px 12px;">Suiv. →</button>
            </div>
          </div>`}
      </div>`;

    wire(rows);
  }

  function wire(rows) {
    let t;
    root.querySelector("#gr-partenaire")?.addEventListener("input", (e) => {
      clearTimeout(t);
      t = setTimeout(() => { state.partenaire = e.target.value; state.page = 1; load(); }, 400);
    });
    root.querySelector("#gr-annee")?.addEventListener("change", (e) => { state.annee = e.target.value; state.page = 1; load(); });
    root.querySelector("#gr-statut")?.addEventListener("change", (e) => { state.statut = e.target.value; state.page = 1; load(); });
    root.querySelector("#gr-create")?.addEventListener("click", () => openForm());
    root.querySelector("#gr-prev")?.addEventListener("click", () => { if (state.page > 1) { state.page--; load(); } });
    root.querySelector("#gr-next")?.addEventListener("click", () => { state.page++; load(); });
    root.querySelectorAll("[data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const row = rows.find(r => r.id == id);
        if (btn.getAttribute("data-act") === "edit") openForm(row);
        else confirmDelete({ label: row?.numero_tc, onConfirm: async () => { await api.del(`/api/conteneurs/${id}`); load(); } });
      });
    });
  }

  async function openForm(row) {
    const isEdit = !!row;
    const navires = await loadNavires();
    const f = row || {
      numero_tc: "", type_tc: "TC20", partenaire: "", navire_id: "",
      annee: new Date().getFullYear(), mois_num: "", mois: "",
      date_arrivee: "", port_origine: "", port_destination: "",
      statut: "EN COURS", notes: "",
    };

    openModal({
      title: isEdit ? `Modifier conteneur ${escapeHtml(f.numero_tc || "")}` : "Nouveau conteneur",
      bodyHTML: `
        <form id="gr-form" class="flex flex-col gap-3">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">N° TC</label><input name="numero_tc" class="form-input" value="${escapeHtml(f.numero_tc ?? "")}" /></div>
            <div><label class="form-label">Type</label>
              <select name="type_tc" class="form-input">
                ${TYPES_TC.map(t => `<option value="${t}" ${f.type_tc === t ? "selected" : ""}>${t}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Partenaire</label><input name="partenaire" class="form-input" value="${escapeHtml(f.partenaire ?? "")}" /></div>
            <div><label class="form-label">Navire</label>
              <div class="flex gap-2">
                <select name="navire_id" class="form-input" style="flex:1;">
                  <option value="">— Aucun —</option>
                  ${navires.map(n => `<option value="${n.id}" ${String(f.navire_id) === String(n.id) ? "selected" : ""}>${escapeHtml(n.nom)}</option>`).join("")}
                </select>
                <button type="button" class="btn-ghost" id="gr-navire-new" title="Créer un navire" style="padding:6px 10px;">＋</button>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div><label class="form-label">Année *</label><input name="annee" type="number" class="form-input" value="${f.annee ?? ""}" required /></div>
            <div><label class="form-label">Mois (num)</label><input name="mois_num" type="number" min="1" max="12" class="form-input" value="${f.mois_num ?? ""}" /></div>
            <div><label class="form-label">Date arrivée</label><input name="date_arrivee" type="date" class="form-input" value="${escapeHtml(f.date_arrivee ?? "")}" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="form-label">Port origine</label><input name="port_origine" class="form-input" value="${escapeHtml(f.port_origine ?? "")}" /></div>
            <div><label class="form-label">Port destination</label><input name="port_destination" class="form-input" value="${escapeHtml(f.port_destination ?? "")}" /></div>
          </div>
          <div><label class="form-label">Statut</label>
            <select name="statut" class="form-input">
              ${STATUTS_TC.map(s => `<option value="${s}" ${f.statut === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </div>
          <div><label class="form-label">Notes</label><textarea name="notes" class="form-input" rows="2">${escapeHtml(f.notes ?? "")}</textarea></div>
          <p id="gr-err" class="form-error" style="display:none;"></p>
        </form>
      `,
      footerHTML: `
        <button class="btn-ghost" data-modal-close>Annuler</button>
        <button class="btn-primary" data-submit>${isEdit ? "Mettre à jour" : "Créer"}</button>
      `,
      onMount: (overlay, close) => {
        const navireSelect = overlay.querySelector('[name="navire_id"]');
        overlay.querySelector("#gr-navire-new").addEventListener("click", () => {
          openNavireModal((created) => {
            NAVIRES_CACHE = null;
            const opt = document.createElement("option");
            opt.value = created.id;
            opt.textContent = created.nom;
            opt.selected = true;
            navireSelect.appendChild(opt);
          });
        });

        overlay.querySelector("[data-submit]").addEventListener("click", async (e) => {
          e.preventDefault();
          const fd = new FormData(overlay.querySelector("#gr-form"));
          const body = {};
          fd.forEach((v, k) => body[k] = v === "" ? null : v);
          ["annee", "mois_num", "navire_id"].forEach(k => { if (body[k] != null) body[k] = parseInt(body[k], 10); });
          if (body.mois_num) body.mois = MOIS[body.mois_num - 1];
          const err = overlay.querySelector("#gr-err");
          if (!body.annee) { err.textContent = "L'année est obligatoire."; err.style.display = "block"; return; }
          try {
            if (isEdit) await api.put(`/api/conteneurs/${row.id}`, body);
            else        await api.post("/api/conteneurs/", body);
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
