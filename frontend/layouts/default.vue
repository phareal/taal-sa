<script setup lang="ts">
import { computed } from "vue";

const route = useRoute();

// ── Groupes de navigation ─────────────────────────────────────────────────────
const navGroups = [
  {
    label: "Direction",
    items: [
      { to: "/", label: "Vue Globale", exact: true,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>` },
    ],
  },
  {
    label: "Opérations",
    items: [
      { to: "/connaissements", label: "Connaissements", exact: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>` },
      { to: "/groupage", label: "Groupage / TC", exact: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>` },
      { to: "/clients", label: "Clients", exact: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>` },
      { to: "/shippers", label: "Shippers", exact: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l1.8-9A2 2 0 016.7 6h10.6a2 2 0 011.9 2l1.8 9"/><path d="M12 6V2"/><path d="M1 17h22"/></svg>` },
    ],
  },
  {
    label: "Commercial",
    items: [
      { to: "/cotations", label: "Cotations", exact: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>` },
      { to: "/prospects", label: "Prospection", exact: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>` },
    ],
  },
  {
    label: "Gestion",
    items: [
      { to: "/rh", label: "Ressources Humaines", exact: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3l-4 4-4-4"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg>` },
      { to: "/comptabilite", label: "Comptabilité", exact: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>` },
      { to: "/audit", label: "Audit", exact: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>` },
    ],
  },
  {
    label: "Outils",
    items: [
      { to: "/import", label: "Import / Export", exact: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>` },
    ],
  },
];

// Flat list pour la logique isActive
const nav = navGroups.flatMap(g => g.items);

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/":              { title: "Vue Globale — Executive Dashboard",    subtitle: "Groupage LCL · 2019–2026 · 2 549 expéditions" },
  "/connaissements":{ title: "Connaissements",                       subtitle: "Gestion des B/L et expéditions" },
  "/groupage":      { title: "Groupage — Conteneurs",                subtitle: "TC par mois · B/L · Marges · Partenaires" },
  "/clients":       { title: "Clients / Consignataires",             subtitle: "1 100+ clients uniques · 2019–2026" },
  "/shippers":      { title: "Shippers — Expéditeurs",               subtitle: "Analyse des performances et statuts" },
  "/cotations":     { title: "Cotations Commerciales",               subtitle: "Pipeline COT · Suivi des opportunités · Paiements" },
  "/prospects":     { title: "Prospection Commerciale",              subtitle: "Shippers à relancer · Opportunités identifiées" },
  "/rh":            { title: "Ressources Humaines",                  subtitle: "Effectifs · Performances annuelles · Primes" },
  "/comptabilite":  { title: "Comptabilité",                         subtitle: "Recettes · Dépenses · Résultat net · Paiements" },
  "/audit":         { title: "Audit & Conformité",                   subtitle: "Missions d'audit · Observations · Plans d'action" },
  "/import":        { title: "Import / Export Excel",                subtitle: "Traitement des fichiers · Upsert sur N° B/L" },
};

const currentMeta = computed(
  () => pageMeta[route.path] ?? { title: "TAAL SA Dashboard", subtitle: "Solutions logistiques complètes" }
);

function isActive(item: { to: string; exact: boolean }): boolean {
  if (item.exact) return route.path === item.to;
  return route.path.startsWith(item.to) && item.to !== "/";
}
</script>

<template>
  <div class="flex w-full min-h-screen" style="background: var(--bg);">

    <!-- ── SIDEBAR ─────────────────────────────────────────────────────────── -->
    <nav
      class="sidebar fixed left-0 top-0 z-50 flex flex-col py-4 gap-0.5"
      style="
        min-height: 100vh;
        background: var(--bg2);
        border-right: 1px solid var(--border2);
        overflow: hidden;
      "
    >
      <!-- Logo -->
      <div class="flex items-center w-full px-3 mb-3 overflow-hidden flex-shrink-0">
        <div
          class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-[10px]"
          style="background: linear-gradient(135deg, #c9975a, #e8b87a);"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="#0a0b0d">
            <path d="M20 21l-8-4-8 4V5a2 2 0 012-2h12a2 2 0 012 2z"/>
          </svg>
        </div>
        <div class="ml-3 overflow-hidden" style="opacity:0; transition:opacity 0.2s;" :data-label="true">
          <div style="font-family:'Syne',sans-serif; font-weight:800; font-size:16px; color:var(--gold2); white-space:nowrap;">TAAL SA</div>
          <div style="font-size:9px; color:var(--text3); white-space:nowrap; letter-spacing:0.08em; text-transform:uppercase;">Logistique Maritime</div>
        </div>
      </div>

      <!-- Groupes de nav -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden w-full" style="scrollbar-width:none;">
        <template v-for="group in navGroups" :key="group.label">
          <!-- Séparateur de groupe avec label -->
          <div
            class="overflow-hidden"
            style="padding: 6px 12px 2px; opacity:0; transition:opacity 0.2s; height:20px;"
            :data-label="true"
          >
            <span style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--text3);">
              {{ group.label }}
            </span>
          </div>

          <template v-for="item in group.items" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="nav-link flex-shrink-0 mx-1.5"
              :class="{ 'router-link-active': isActive(item) }"
              style="width: calc(100% - 12px);"
            >
              <span
                class="flex-shrink-0"
                style="width: 20px; height: 20px;"
                v-html="item.icon"
              />
              <span
                class="text-[12px] font-medium overflow-hidden whitespace-nowrap"
                style="opacity: 0; transition: opacity 0.2s;"
                :data-label="true"
              >
                {{ item.label }}
              </span>
            </NuxtLink>
          </template>
        </template>
      </div>

      <!-- Footer -->
      <div class="mt-auto px-3 pb-1 overflow-hidden flex-shrink-0">
        <span
          class="text-[10px] whitespace-nowrap"
          style="color: var(--text3); opacity: 0; transition: opacity 0.2s;"
          :data-label="true"
        >
          © 2026 TAAL SA · Lomé, Togo
        </span>
      </div>
    </nav>

    <!-- ── MAIN ────────────────────────────────────────────────────────────── -->
    <div class="flex flex-col flex-1 min-w-0 min-h-screen" style="margin-left: 72px;">

      <!-- Header -->
      <header
        class="flex items-center justify-between px-7 sticky top-0 z-40"
        style="height: 64px; background: var(--bg2); border-bottom: 1px solid var(--border2);"
      >
        <div>
          <div style="font-family:'Syne',sans-serif; font-size:17px; font-weight:700; color:var(--text);">
            {{ currentMeta.title }}
          </div>
          <div style="font-size:12px; color:var(--text3); margin-top:1px;">
            {{ currentMeta.subtitle }}
          </div>
        </div>
        <div class="flex items-center gap-2.5">
          <slot name="filters" />
          <div
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
            style="background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.25); color:var(--green);"
          >
            <div class="live-dot" />
            Données Réelles
          </div>
        </div>
      </header>

      <!-- Page -->
      <main class="flex-1 p-7 min-w-0 overflow-x-hidden page-enter">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 72px;
  transition: width 0.28s ease;
}
.sidebar:hover {
  width: 230px;
}
.sidebar:hover [data-label] { opacity: 1 !important; }

/* Quand le sidebar s'étend, les séparateurs prennent de la hauteur */
.sidebar:hover div[data-label] { height: auto !important; }
</style>
