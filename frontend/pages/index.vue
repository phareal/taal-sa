<script setup lang="ts">
import type { KpiOut, CaAnnuelRow, CaMensuelRow, CaParClientRow, ComptaSummary } from "~/types/api";

const api = useApi();

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(0) + "K";
  return v.toLocaleString("fr-FR");
}
function fmtFull(v: number): string { return v.toLocaleString("fr-FR"); }
function pct(v: number, t: number): string { return t ? ((v / t) * 100).toFixed(1) + "%" : "—"; }
function delta(curr: number, prev: number): string {
  if (!prev) return "—";
  const p = ((curr - prev) / prev) * 100;
  return (p >= 0 ? "+" : "") + p.toFixed(1) + "%";
}
function deltaType(curr: number, prev: number): "up" | "down" {
  return curr >= prev ? "up" : "down";
}

// ── Fetch all data in parallel ────────────────────────────────────────────
const currentYear = new Date().getFullYear();

const [
  { data: kpiCurrent },
  { data: kpiPrev    },
  { data: caAnnuel   },
  { data: caMensuel  },
  { data: topClients },
  { data: compta     },
] = await Promise.all([
  useAsyncData("kpi-current",   () => api.get<KpiOut>(`/api/analytics/kpis?annee=${currentYear}`)),
  useAsyncData("kpi-prev",      () => api.get<KpiOut>(`/api/analytics/kpis?annee=${currentYear - 1}`)),
  useAsyncData("ca-annuel",     () => api.get<CaAnnuelRow[]>("/api/analytics/ca-annuel")),
  useAsyncData("ca-mensuel",    () => api.get<CaMensuelRow[]>(
    `/api/analytics/ca-mensuel?annees[]=${currentYear - 4}&annees[]=${currentYear - 3}&annees[]=${currentYear - 2}&annees[]=${currentYear - 1}&annees[]=${currentYear}`
  )),
  useAsyncData("top-clients",    () => api.get<CaParClientRow[]>("/api/analytics/ca-par-client?limit=10")),
  useAsyncData("compta-summary", () => api.get<ComptaSummary>(`/api/comptabilite/summary?annee=${currentYear}`).catch(() => null)),
]);

// ── Derived stats ─────────────────────────────────────────────────────────
const globalCA     = computed(() => caAnnuel.value?.reduce((s, r) => s + r.ca, 0) ?? 0);
const globalBL     = computed(() => caAnnuel.value?.reduce((s, r) => s + r.nb_bl, 0) ?? 0);
const nbAnnees     = computed(() => caAnnuel.value?.length ?? 0);
const totalCliCA   = computed(() => topClients.value?.reduce((s, c) => s + c.ca_total, 0) ?? 0);

// ── Heatmap ───────────────────────────────────────────────────────────────
const MOIS_LABELS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

// Build a map: year → mois_num → ca
const heatmapMap = computed((): Record<number, Record<number, number>> => {
  const map: Record<number, Record<number, number>> = {};
  for (const row of caMensuel.value ?? []) {
    if (!map[row.annee]) map[row.annee] = {};
    map[row.annee][row.mois_num] = row.ca;
  }
  return map;
});

const heatmapYears = computed(() =>
  Object.keys(heatmapMap.value).map(Number).sort()
);

const heatmapMax = computed(() => {
  const vals = Object.values(heatmapMap.value).flatMap(m => Object.values(m));
  return vals.length ? Math.max(...vals) : 1;
});

function heatCellStyle(moisNum: number, year: number): Record<string, string> {
  const v = heatmapMap.value[year]?.[moisNum] ?? 0;
  if (!v) return { background: "transparent", color: "var(--text3)", padding: "3px", textAlign: "center", borderRadius: "3px", fontSize: "9px" };
  const intensity = v / heatmapMax.value;
  const alpha     = (0.1 + intensity * 0.85).toFixed(2);
  const bg = v > 8_000_000 ? `rgba(201,151,90,${alpha})`
           : v > 4_000_000 ? `rgba(96,165,250,${alpha})`
           : `rgba(45,212,191,${alpha})`;
  return {
    padding: "3px",
    textAlign: "center",
    background: bg,
    borderRadius: "3px",
    color: intensity > 0.5 ? "#0a0b0d" : "#f0ede8",
    fontSize: "9px",
    fontWeight: "500",
  };
}

// ── ApexCharts options ────────────────────────────────────────────────────
const AXIS_LABELS = { style: { colors: "#636878", fontSize: "11px" } };
const GRID = { borderColor: "rgba(255,255,255,0.04)", strokeDashArray: 0 };

// CA annual area chart
const caChartSeries = computed(() => [{
  name: "CA FCFA",
  data: caAnnuel.value?.map(r => r.ca) ?? [],
}]);
const caChartOptions = computed(() => ({
  chart: { type: "area", background: "transparent", toolbar: { show: false }, fontFamily: "DM Sans, sans-serif" },
  theme: { mode: "dark" },
  colors: ["#e8b87a"],
  stroke: { curve: "smooth", width: 2 },
  fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.18, opacityTo: 0.01, stops: [0, 100] } },
  dataLabels: { enabled: false },
  markers: { size: 4, colors: ["#c9975a"], strokeWidth: 0, hover: { size: 7 } },
  grid: GRID,
  xaxis: { categories: caAnnuel.value?.map(r => String(r.annee)) ?? [], labels: AXIS_LABELS, axisBorder: { show: false }, axisTicks: { show: false } },
  yaxis: { labels: { ...AXIS_LABELS, formatter: (v: number) => fmt(v) } },
  tooltip: { theme: "dark", y: { formatter: (v: number) => fmt(v) + " FCFA" } },
}));

// BL annual bar chart
const blChartSeries = computed(() => [{
  name: "B/L",
  data: caAnnuel.value?.map(r => r.nb_bl) ?? [],
}]);
const blChartOptions = computed(() => ({
  chart: { type: "bar", background: "transparent", toolbar: { show: false }, fontFamily: "DM Sans, sans-serif" },
  theme: { mode: "dark" },
  colors: ["#c9975a"],
  plotOptions: { bar: { borderRadius: 4, columnWidth: "60%", distributed: true } },
  dataLabels: { enabled: false },
  legend: { show: false },
  grid: GRID,
  xaxis: { categories: caAnnuel.value?.map(r => String(r.annee)) ?? [], labels: AXIS_LABELS, axisBorder: { show: false }, axisTicks: { show: false } },
  yaxis: { labels: AXIS_LABELS },
  tooltip: { theme: "dark", y: { formatter: (v: number) => v + " B/L" } },
}));

// Top clients donut
const donutSeries = computed(() => topClients.value?.slice(0, 5).map(c => c.ca_total) ?? []);
const donutOptions = computed(() => ({
  chart: { type: "donut", background: "transparent", fontFamily: "DM Sans, sans-serif" },
  theme: { mode: "dark" },
  colors: ["#c9975a", "#e8b87a", "#60a5fa", "#2dd4bf", "#4ade80"],
  labels: topClients.value?.slice(0, 5).map(c => c.nom.length > 18 ? c.nom.slice(0, 18) + "…" : c.nom) ?? [],
  legend: { show: true, position: "bottom", labels: { colors: "#9fa3ad" }, fontSize: "10px", itemMargin: { horizontal: 4, vertical: 2 } },
  plotOptions: { pie: { donut: { size: "65%" } } },
  dataLabels: { enabled: false },
  tooltip: { theme: "dark", y: { formatter: (v: number) => fmt(v) + " FCFA" } },
}));
</script>

<template>
  <!-- Summary strip -->
  <div class="stat-strip">
    <div class="strip-item">
      <div class="strip-val">{{ fmt(globalCA) }}</div>
      <div class="strip-label">CA Total FCFA (toutes années)</div>
    </div>
    <div class="strip-item">
      <div class="strip-val">{{ globalBL.toLocaleString("fr-FR") }}</div>
      <div class="strip-label">Expéditions totales</div>
    </div>
    <div class="strip-item">
      <div class="strip-val">{{ topClients?.length ? topClients.length + "+" : "—" }}</div>
      <div class="strip-label">Clients actifs (top)</div>
    </div>
    <div class="strip-item">
      <div class="strip-val">
        {{ kpiCurrent?.taux_marge_moyen != null
            ? (kpiCurrent.taux_marge_moyen * 100).toFixed(1) + "%"
            : "—" }}
      </div>
      <div class="strip-label">Taux de marge moyen ({{ currentYear }})</div>
    </div>
    <div class="strip-item">
      <div class="strip-val">{{ nbAnnees }}</div>
      <div class="strip-label">Années d'activité</div>
    </div>
  </div>

  <!-- KPI cards -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
    <!-- CA année courante -->
    <div class="kpi-card">
      <div class="kpi-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9975a" stroke-width="2">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/>
        </svg>
      </div>
      <div class="kpi-label">Chiffre d'Affaires {{ currentYear }}</div>
      <div class="kpi-value">{{ fmt(kpiCurrent?.ca_total) }} <span class="kpi-sub">FCFA</span></div>
      <div
        v-if="kpiCurrent && kpiPrev"
        class="kpi-delta"
        :class="deltaType(kpiCurrent.ca_total, kpiPrev.ca_total)"
      >
        {{ delta(kpiCurrent.ca_total, kpiPrev.ca_total) }} vs {{ currentYear - 1 }}
      </div>
    </div>

    <!-- Nb B/L -->
    <div class="kpi-card">
      <div class="kpi-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9975a" stroke-width="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      </div>
      <div class="kpi-label">Expéditions {{ currentYear }}</div>
      <div class="kpi-value">{{ kpiCurrent?.nb_bl ?? "—" }} <span class="kpi-sub">B/L</span></div>
      <div
        v-if="kpiCurrent && kpiPrev"
        class="kpi-delta"
        :class="deltaType(kpiCurrent.nb_bl, kpiPrev.nb_bl)"
      >
        {{ delta(kpiCurrent.nb_bl, kpiPrev.nb_bl) }} vs {{ currentYear - 1 }}
      </div>
    </div>

    <!-- Volume -->
    <div class="kpi-card">
      <div class="kpi-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9975a" stroke-width="2">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        </svg>
      </div>
      <div class="kpi-label">Volume {{ currentYear }}</div>
      <div class="kpi-value">
        {{ kpiCurrent?.volume_m3 ? kpiCurrent.volume_m3.toFixed(0) : "—" }}
        <span class="kpi-sub">M³</span>
      </div>
      <div
        v-if="kpiCurrent && kpiPrev && kpiPrev.volume_m3"
        class="kpi-delta"
        :class="deltaType(kpiCurrent.volume_m3, kpiPrev.volume_m3)"
      >
        {{ delta(kpiCurrent.volume_m3, kpiPrev.volume_m3) }} vs {{ currentYear - 1 }}
      </div>
    </div>

    <!-- CA moyen / B/L -->
    <div class="kpi-card">
      <div class="kpi-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9975a" stroke-width="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      </div>
      <div class="kpi-label">CA Moy / Expédition {{ currentYear }}</div>
      <div class="kpi-value">{{ fmt(kpiCurrent?.ca_moy_par_bl) }} <span class="kpi-sub">FCFA</span></div>
      <div class="kpi-delta neutral">↑ Qualité dossiers</div>
    </div>
  </div>

  <!-- Finance strip — Comptabilité temps réel -->
  <div v-if="compta" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
    <div class="kpi-card" style="border-color: rgba(99,153,34,0.3);">
      <div class="kpi-label">Recettes {{ currentYear }}</div>
      <div class="kpi-value" style="color:var(--green); font-size:16px;">
        {{ fmt(compta.total_recettes) }} <span class="kpi-sub">FCFA</span>
      </div>
      <div class="kpi-delta up">↑ {{ compta.nb_recettes }} opération(s)</div>
    </div>
    <div class="kpi-card" style="border-color: rgba(226,75,74,0.3);">
      <div class="kpi-label">Dépenses {{ currentYear }}</div>
      <div class="kpi-value" style="color:var(--danger); font-size:16px;">
        {{ fmt(compta.total_depenses) }} <span class="kpi-sub">FCFA</span>
      </div>
      <div class="kpi-delta down">↓ {{ compta.nb_depenses }} opération(s)</div>
    </div>
    <div class="kpi-card" :style="compta.resultat_net >= 0 ? 'border-color:rgba(99,153,34,0.3);' : 'border-color:rgba(226,75,74,0.3);'">
      <div class="kpi-label">Résultat net {{ currentYear }}</div>
      <div
        class="kpi-value" style="font-size:16px;"
        :style="compta.resultat_net >= 0 ? 'color:var(--green);' : 'color:var(--danger);'"
      >
        {{ fmt(compta.resultat_net) }} <span class="kpi-sub">FCFA</span>
      </div>
      <div class="kpi-delta neutral">Recettes − Dépenses</div>
    </div>
    <div class="kpi-card" style="border-color: rgba(239,159,39,0.3);">
      <div class="kpi-label">Paiements en attente</div>
      <div class="kpi-value" style="color:#EF9F27; font-size:16px;">
        {{ fmt(compta.montant_en_attente) }} <span class="kpi-sub">FCFA</span>
      </div>
      <div class="kpi-delta neutral">{{ compta.nb_en_attente }} facture(s) non réglée(s)</div>
    </div>
  </div>

  <!-- Charts row: CA annuel + BL annuel -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
    <div class="app-card">
      <div class="card-header">
        <div class="card-title">Évolution du CA — toutes années</div>
        <span class="card-badge">Annuel</span>
      </div>
      <ClientOnly>
        <apexchart v-if="caChartSeries[0].data.length" type="area" height="240" :options="caChartOptions" :series="caChartSeries" />
        <div v-else style="height:240px;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:12px;">
          Aucune donnée
        </div>
        <template #fallback>
          <div style="height:240px;display:flex;align-items:center;justify-content:center;color:var(--text3);">Chargement…</div>
        </template>
      </ClientOnly>
    </div>

    <div class="app-card">
      <div class="card-header">
        <div class="card-title">Nombre d'expéditions / an</div>
        <span class="card-badge">B/L émis</span>
      </div>
      <ClientOnly>
        <apexchart v-if="blChartSeries[0].data.length" type="bar" height="240" :options="blChartOptions" :series="blChartSeries" />
        <div v-else style="height:240px;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:12px;">
          Aucune donnée
        </div>
        <template #fallback>
          <div style="height:240px;display:flex;align-items:center;justify-content:center;color:var(--text3);">Chargement…</div>
        </template>
      </ClientOnly>
    </div>
  </div>

  <!-- Heatmap + Donut -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
    <!-- Heatmap (2/3) -->
    <div class="app-card lg:col-span-2">
      <div class="card-header">
        <div class="card-title">CA mensuel — heatmap</div>
        <span class="card-badge">par année</span>
      </div>
      <div style="overflow-x: auto;">
        <table v-if="heatmapYears.length" style="width:100%; border-collapse:collapse; font-size:10px;">
          <thead>
            <tr>
              <th style="color:var(--text3);padding:3px;text-align:left;min-width:30px;"></th>
              <th
                v-for="year in heatmapYears"
                :key="year"
                style="color:var(--text2);padding:3px;text-align:center;font-weight:500;min-width:50px;"
              >{{ year }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(label, idx) in MOIS_LABELS" :key="label">
              <td style="color:var(--text3);padding:3px 6px;white-space:nowrap;">{{ label }}</td>
              <td
                v-for="year in heatmapYears"
                :key="year"
                :style="heatCellStyle(idx + 1, year)"
                :title="`${label} ${year} : ${fmtFull(heatmapMap[year]?.[idx + 1] ?? 0)} FCFA`"
              >
                {{ (heatmapMap[year]?.[idx + 1] ?? 0) > 0
                    ? ((heatmapMap[year]![idx + 1]) / 1e6).toFixed(1)
                    : "—" }}
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else style="height:160px;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:12px;">
          Aucune donnée mensuelle
        </div>
      </div>
    </div>

    <!-- Donut top 5 clients (1/3) -->
    <div class="app-card">
      <div class="card-header">
        <div class="card-title">Top 5 Clients</div>
        <span class="card-badge">CA Total</span>
      </div>
      <ClientOnly>
        <apexchart v-if="donutSeries.length" type="donut" height="260" :options="donutOptions" :series="donutSeries" />
        <div v-else style="height:260px;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:12px;">
          Aucune donnée
        </div>
        <template #fallback>
          <div style="height:260px;display:flex;align-items:center;justify-content:center;color:var(--text3);">Chargement…</div>
        </template>
      </ClientOnly>
    </div>
  </div>

  <!-- Top clients table -->
  <div class="app-card">
    <div class="card-header">
      <div class="card-title">Top Consignataires — CA Total</div>
      <span class="card-badge">Toutes années</span>
    </div>
    <table class="data-table w-full">
      <thead>
        <tr>
          <th>#</th>
          <th>CLIENT</th>
          <th>CA TOTAL</th>
          <th>B/L</th>
          <th>PART %</th>
          <th>PERFORMANCE</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!topClients?.length">
          <td colspan="6" style="text-align:center;padding:32px;color:var(--text3);">
            Aucune donnée client
          </td>
        </tr>
        <tr v-for="(c, i) in topClients" :key="c.client_id">
          <td><span class="rank-badge" :class="i < 3 ? `t${i + 1}` : ''">{{ i + 1 }}</span></td>
          <td style="color:var(--text);font-weight:500;">{{ c.nom }}</td>
          <td class="gold-text" style="font-family:'DM Mono',monospace;">{{ fmt(c.ca_total) }} FCFA</td>
          <td style="color:var(--text2);">{{ c.nb_bl }}</td>
          <td style="color:var(--text3);">{{ pct(c.ca_total, totalCliCA) }}</td>
          <td style="min-width:120px;">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: topClients[0]?.ca_total ? ((c.ca_total / topClients[0].ca_total) * 100).toFixed(0) + '%' : '0%' }"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
