import { currentPath } from "./router.js";

const SVG = (path) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">${path}</svg>`;

const NAV_ICONS = {
  home:          SVG('<path d="M3 12l9-9 9 9"/><path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10"/>'),
  bl:            SVG('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>'),
  container:     SVG('<rect x="3" y="6" width="18" height="13" rx="1"/><line x1="8" y1="6" x2="8" y2="19"/><line x1="12" y1="6" x2="12" y2="19"/><line x1="16" y1="6" x2="16" y2="19"/>'),
  clients:       SVG('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'),
  shippers:      SVG('<path d="M3 17l9 4 9-4"/><path d="M3 12l9 4 9-4"/><path d="M3 7l9-4 9 4-9 4-9-4z"/>'),
  cotations:     SVG('<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
  prospects:     SVG('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>'),
  rh:            SVG('<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>'),
  comptabilite:  SVG('<rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="10" y2="11"/><line x1="13" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="10" y2="15"/><line x1="13" y1="15" x2="16" y2="15"/><line x1="8" y1="18" x2="10" y2="18"/>'),
  audit:         SVG('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>'),
  import:        SVG('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>'),
};

const NAV_GROUPS = [
  {
    label: "Direction",
    items: [{ to: "/", label: "Vue Globale", exact: true, icon: NAV_ICONS.home }],
  },
  {
    label: "Opérations",
    items: [
      { to: "/connaissements", label: "Connaissements", icon: NAV_ICONS.bl },
      { to: "/groupage",       label: "Groupage / TC",  icon: NAV_ICONS.container },
      { to: "/clients",        label: "Clients",        icon: NAV_ICONS.clients },
      { to: "/shippers",       label: "Shippers",       icon: NAV_ICONS.shippers },
    ],
  },
  {
    label: "Commercial",
    items: [
      { to: "/cotations",  label: "Cotations",   icon: NAV_ICONS.cotations },
      { to: "/prospects",  label: "Prospection", icon: NAV_ICONS.prospects },
    ],
  },
  {
    label: "Gestion",
    items: [
      { to: "/rh",           label: "Ressources Humaines", icon: NAV_ICONS.rh },
      { to: "/comptabilite", label: "Comptabilité",        icon: NAV_ICONS.comptabilite },
      { to: "/audit",        label: "Audit",               icon: NAV_ICONS.audit },
    ],
  },
  {
    label: "Outils",
    items: [{ to: "/import", label: "Import / Export", icon: NAV_ICONS.import }],
  },
];

const PAGE_META = {
  "/":               { title: "Vue Globale — Executive Dashboard",    subtitle: "Groupage LCL · 2019–2026" },
  "/connaissements": { title: "Connaissements",                        subtitle: "Gestion des B/L et expéditions" },
  "/groupage":       { title: "Groupage — Conteneurs",                 subtitle: "TC par mois · B/L · Marges · Partenaires" },
  "/clients":        { title: "Clients / Consignataires",              subtitle: "Consignataires enregistrés" },
  "/shippers":       { title: "Shippers — Expéditeurs",                subtitle: "Analyse des performances et statuts" },
  "/cotations":      { title: "Cotations Commerciales",                subtitle: "Pipeline COT · Suivi des opportunités" },
  "/prospects":      { title: "Prospection Commerciale",               subtitle: "Shippers à relancer · Opportunités" },
  "/rh":             { title: "Ressources Humaines",                   subtitle: "Effectifs · Performances annuelles" },
  "/comptabilite":   { title: "Comptabilité",                          subtitle: "Recettes · Dépenses · Résultat net" },
  "/audit":          { title: "Audit & Conformité",                    subtitle: "Missions d'audit · Observations" },
  "/import":         { title: "Import / Export Excel",                 subtitle: "Traitement des fichiers · Upsert sur N° B/L" },
};

function isActive(to, exact) {
  const p = currentPath();
  if (exact) return p === to;
  return p === to || (p.startsWith(to) && to !== "/");
}

function navHTML() {
  return NAV_GROUPS.map(group => `
    <div class="overflow-hidden" style="padding: 6px 12px 2px; height:20px;">
      <span style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--text3);" data-label>
        ${group.label}
      </span>
    </div>
    ${group.items.map(it => `
      <a href="${it.to}" data-link
         class="nav-link flex-shrink-0 mx-1.5 ${isActive(it.to, it.exact) ? "router-link-active" : ""}"
         style="width: calc(100% - 12px);">
        <span class="flex-shrink-0 flex items-center justify-center" style="width:20px; height:20px;">${it.icon || ""}</span>
        <span data-label class="text-[12px] font-medium">${it.label}</span>
      </a>
    `).join("")}
  `).join("");
}

export function renderShell() {
  const app = document.getElementById("app");
  const meta = PAGE_META[currentPath()] || { title: "TAAL SA Dashboard", subtitle: "Solutions logistiques" };

  app.innerHTML = `
    <div class="flex w-full min-h-screen" style="background: var(--bg);">
      <nav class="sidebar fixed left-0 top-0 z-50 flex flex-col py-4 gap-0.5"
           style="min-height:100vh; background:var(--bg2); border-right:1px solid var(--border2); overflow:hidden;">
        <div class="flex items-center w-full px-3 mb-3 overflow-hidden flex-shrink-0">
          <div class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-[10px]"
               style="background: linear-gradient(135deg, #c9975a, #e8b87a);">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="#0a0b0d">
              <path d="M20 21l-8-4-8 4V5a2 2 0 012-2h12a2 2 0 012 2z"/>
            </svg>
          </div>
          <div class="ml-3 overflow-hidden" data-label>
            <div style="font-family:'Syne',sans-serif; font-weight:800; font-size:16px; color:var(--gold2); white-space:nowrap;">TAAL SA</div>
            <div style="font-size:9px; color:var(--text3); white-space:nowrap; letter-spacing:0.08em; text-transform:uppercase;">Logistique Maritime</div>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto overflow-x-hidden w-full" style="scrollbar-width:none;">
          ${navHTML()}
        </div>
        <div class="mt-auto px-3 pb-1 overflow-hidden flex-shrink-0">
          <span data-label class="text-[10px] whitespace-nowrap" style="color:var(--text3);">© 2026 TAAL SA · Lomé, Togo</span>
        </div>
      </nav>

      <div class="flex flex-col flex-1 min-w-0 min-h-screen" style="margin-left: 72px;">
        <header class="flex items-center justify-between px-7 sticky top-0 z-40"
                style="height:64px; background:var(--bg2); border-bottom:1px solid var(--border2);">
          <div>
            <div style="font-family:'Syne',sans-serif; font-size:17px; font-weight:700; color:var(--text);">${meta.title}</div>
            <div style="font-size:12px; color:var(--text3); margin-top:1px;">${meta.subtitle}</div>
          </div>
          <div class="flex items-center gap-2.5">
            <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
                 style="background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.25); color:var(--green);">
              <div class="live-dot"></div>
              Données Réelles
            </div>
          </div>
        </header>
        <main id="page-content" class="flex-1 p-7 min-w-0 overflow-x-hidden page-enter"></main>
      </div>
    </div>

    <style>
      .sidebar { width: 72px; transition: width 0.28s ease; }
      .sidebar:hover { width: 230px; }
      .sidebar [data-label] { opacity: 0; transition: opacity 0.2s; }
      .sidebar:hover [data-label] { opacity: 1; }
    </style>
  `;
}

export function pageRoot() {
  return document.getElementById("page-content");
}
