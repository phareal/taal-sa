import { escapeHtml } from "./format.js";

/* ── Modal latéral (droite) ────────────────────────────────────── */
export function openModal({ title, bodyHTML, footerHTML, onMount, onClose }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 100;
    background: rgba(0,0,0,0.5);
    display: flex; justify-content: flex-end;
  `;
  overlay.innerHTML = `
    <div class="modal-panel" style="
      width: 460px; max-width: 95vw; height: 100vh; overflow-y: auto;
      background: var(--bg2); border-left: 1px solid var(--border);
      display: flex; flex-direction: column;
      animation: slideIn 0.22s ease-out;
    ">
      <div class="flex items-center justify-between px-6 py-4"
           style="border-bottom: 1px solid var(--border2);">
        <h3 style="font-family:'Syne',sans-serif; font-size:16px; font-weight:700; color:var(--text);">
          ${escapeHtml(title || "")}
        </h3>
        <button class="btn-icon" data-modal-close>✕</button>
      </div>
      <div class="flex-1 overflow-y-auto px-6 py-5" data-modal-body>${bodyHTML || ""}</div>
      <div class="flex justify-end gap-2 px-6 py-4"
           style="border-top: 1px solid var(--border2);" data-modal-footer>
        ${footerHTML || ""}
      </div>
    </div>
    <style>
      @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    </style>
  `;

  const close = () => {
    try { if (onClose) onClose(); } catch (_) {}
    overlay.remove();
    document.removeEventListener("keydown", escHandler);
  };
  const escHandler = (e) => { if (e.key === "Escape") close(); };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
    if (e.target.closest("[data-modal-close]")) close();
  });
  document.addEventListener("keydown", escHandler);
  document.body.appendChild(overlay);

  if (onMount) onMount(overlay, close);
  return close;
}

/* ── Confirmation de suppression ───────────────────────────────── */
export function confirmDelete({ label, onConfirm }) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 110;
    background: rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center;
  `;
  overlay.innerHTML = `
    <div style="
      width: 420px; max-width: 95vw;
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: 14px; padding: 24px;
      animation: popIn 0.15s ease-out;
    ">
      <h3 style="font-family:'Syne',sans-serif; font-size:16px; color:var(--text); margin-bottom:8px;">
        Supprimer ?
      </h3>
      <p style="font-size:13px; color:var(--text2); margin-bottom:20px;">
        Voulez-vous vraiment supprimer <strong style="color:var(--gold2);">${escapeHtml(label || "cet élément")}</strong> ?
        Cette action est irréversible.
      </p>
      <div class="flex justify-end gap-2">
        <button class="btn-ghost" data-cancel>Annuler</button>
        <button class="btn-danger" data-confirm>Supprimer</button>
      </div>
    </div>
    <style>
      @keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    </style>
  `;
  const close = () => overlay.remove();
  overlay.addEventListener("click", async (e) => {
    if (e.target === overlay || e.target.closest("[data-cancel]")) close();
    if (e.target.closest("[data-confirm]")) {
      try { await onConfirm(); } finally { close(); }
    }
  });
  document.body.appendChild(overlay);
}

/* ── Badge de statut ───────────────────────────────────────────── */
const STATUT_TAG = {
  ACTIF: "tag-green", "EN_DÉCLIN": "tag-gold", PERDU: "tag-red",
  "GAGNÉ": "tag-green", "EN COURS": "tag-blue", "ANNULÉ": "tag-red",
  P1: "tag-red", P2: "tag-gold", P3: "tag-blue",
  IMPORT: "tag-blue", EXPORT: "tag-teal",
  "À RELANCER": "tag-gold", "RELANCÉ": "tag-green", "EN ATTENTE": "tag-blue",
  CONFORME: "tag-green", NON_CONFORME: "tag-red", PARTIEL: "tag-gold",
};

export function statutBadge(statut) {
  const cls = STATUT_TAG[statut] || "tag-gold";
  return `<span class="tag ${cls}">${escapeHtml(statut ?? "—")}</span>`;
}

/* ── Table générique ───────────────────────────────────────────── */
export function renderTable({ columns, rows, emptyText = "Aucune donnée", actions }) {
  if (!rows || rows.length === 0) {
    return `<div style="padding:32px; text-align:center; color:var(--text3);">${emptyText}</div>`;
  }
  return `
    <table class="data-table w-full">
      <thead>
        <tr>
          ${columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join("")}
          ${actions ? `<th style="text-align:right;">Actions</th>` : ""}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, i) => `
          <tr data-row-index="${i}">
            ${columns.map(c => {
              const val = c.render ? c.render(row[c.key], row, i) : escapeHtml(row[c.key] ?? "—");
              return `<td>${val}</td>`;
            }).join("")}
            ${actions ? `<td style="text-align:right;">${actions(row, i)}</td>` : ""}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* ── Pagination ────────────────────────────────────────────────── */
export function paginationHTML({ page, pages, total, pageSize }) {
  const start = pages ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);
  return `
    <div class="flex items-center justify-between px-2 py-3 mt-2" style="color:var(--text3); font-size:12px;">
      <div>${total > 0 ? `${start}–${end} sur ${total}` : "0 résultat"}</div>
      <div class="flex items-center gap-2">
        <button class="btn-ghost" data-page-prev ${page <= 1 ? "disabled" : ""} style="padding:4px 12px;">← Préc.</button>
        <span>Page ${page} / ${Math.max(pages, 1)}</span>
        <button class="btn-ghost" data-page-next ${page >= pages ? "disabled" : ""} style="padding:4px 12px;">Suiv. →</button>
      </div>
    </div>
  `;
}

/* ── Icônes SVG ────────────────────────────────────────────────── */
export const ICONS = {
  edit:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`,
};
