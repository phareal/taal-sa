import ApexCharts from "apexcharts";
import { api } from "../api.js";
import { fmt, escapeHtml } from "../format.js";
import { getQuery, setQuery } from "../router.js";

const MOIS_LABELS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const MOIS_FULL = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const AXIS_LABELS = { style: { colors: "#636878", fontSize: "11px" } };
const GRID = { borderColor: "rgba(255,255,255,0.04)", strokeDashArray: 0 };

// ISO week count for a given year (52 or 53)
function isoWeeksInYear(y) {
  const d = new Date(Date.UTC(y, 11, 31));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export async function renderHome(root) {
  const currentYear = new Date().getFullYear();

  // ── Filter state (persisted in URL) ─────────────────────────────────────
  const q = getQuery();
  const filters = {
    annee:   q.annee ? Number(q.annee) : currentYear,
    mois:    q.mois ? Number(q.mois) : "",
    semaine: q.semaine ? Number(q.semaine) : "",
  };

  function syncQuery() {
    setQuery({
      annee:   filters.annee !== currentYear ? filters.annee : "",
      mois:    filters.mois || "",
      semaine: filters.semaine || "",
    });
  }

  async function load() {
    root.innerHTML = `<div style="color:var(--text3); padding:32px;">Chargement…</div>`;

    const yr = filters.annee;
    // Current/previous KPIs respect month if set
    const moisQS = filters.mois ? `&mois_num=${filters.mois}` : "";
    const comptaQS = (filters.mois ? `&mois=${filters.mois}` : "")
                  + (filters.semaine ? `&semaine=${filters.semaine}` : "");

    // Heatmap: always show last 5 years incl. selected year
    const heatYears = [];
    for (let y = yr - 4; y <= yr; y++) heatYears.push(y);
    const heatYearsQS = heatYears.map(y => `annees[]=${y}`).join("&");

    const [kpiCurrent, kpiPrev, caAnnuel, caMensuel, topClients, compta] = await Promise.all([
      api.get(`/api/analytics/kpis?annee=${yr}${moisQS}`).catch(() => null),
      api.get(`/api/analytics/kpis?annee=${yr - 1}${moisQS}`).catch(() => null),
      api.get(`/api/analytics/ca-annuel`).catch(() => []),
      api.get(`/api/analytics/ca-mensuel?${heatYearsQS}`).catch(() => []),
      api.get(`/api/analytics/ca-par-client?annee=${yr}&limit=10`).catch(() => []),
      api.get(`/api/comptabilite/summary?annee=${yr}${comptaQS}`).catch(() => null),
    ]);

    draw({ kpiCurrent, kpiPrev, caAnnuel, caMensuel, topClients, compta, heatYears });
  }

  let charts = [];

  function destroyCharts() {
    charts.forEach(c => { try { c.destroy(); } catch (_) {} });
    charts = [];
  }

  function draw({ kpiCurrent, kpiPrev, caAnnuel, caMensuel, topClients, compta, heatYears }) {
    destroyCharts();

    const yr = filters.annee;
    const globalCA   = (caAnnuel || []).reduce((s, r) => s + (r.ca || 0), 0);
    const globalBL   = (caAnnuel || []).reduce((s, r) => s + (r.nb_bl || 0), 0);
    const nbAnnees   = (caAnnuel || []).length;
    const totalCliCA = (topClients || []).reduce((s, c) => s + (c.ca_total || 0), 0);

    // Heatmap data — keyed by year then mois_num
    const heatmapMap = {};
    for (const row of caMensuel || []) {
      if (!heatmapMap[row.annee]) heatmapMap[row.annee] = {};
      heatmapMap[row.annee][row.mois_num] = row.ca;
    }
    const heatmapMax = Math.max(1, ...Object.values(heatmapMap).flatMap(m => Object.values(m)));

    const heatCellStyle = (moisNum, year) => {
      const v = heatmapMap[year]?.[moisNum] ?? 0;
      const isFilteredMois = filters.mois && Number(filters.mois) === moisNum && year === yr;
      const ring = isFilteredMois ? "outline:1px solid var(--gold2);" : "";
      if (!v) return `padding:3px; text-align:center; border-radius:3px; font-size:9px; color:var(--text3); ${ring}`;
      const intensity = v / heatmapMax;
      const alpha = (0.1 + intensity * 0.85).toFixed(2);
      const bg = v > 8e6 ? `rgba(201,151,90,${alpha})`
               : v > 4e6 ? `rgba(96,165,250,${alpha})`
               : `rgba(45,212,191,${alpha})`;
      return `padding:3px; text-align:center; border-radius:3px; font-size:9px; font-weight:500;
              background:${bg}; color:${intensity > 0.5 ? "#0a0b0d" : "#f0ede8"}; ${ring}`;
    };

    const delta = (a, b) => {
      if (!b) return "—";
      const p = ((a - b) / b) * 100;
      return (p >= 0 ? "+" : "") + p.toFixed(1) + "%";
    };
    const deltaCls = (a, b) => (a >= b ? "up" : "down");

    // Year options: last 8 years + current
    const yearOptions = [];
    for (let y = currentYear; y >= currentYear - 7; y--) yearOptions.push(y);

    // Week options: 1..isoWeeksInYear(yr)
    const nbSemaines = isoWeeksInYear(yr);
    const weekOptions = Array.from({ length: nbSemaines }, (_, i) => i + 1);

    const periodLabel = [
      `Année ${yr}`,
      filters.mois ? MOIS_FULL[filters.mois - 1] : "",
      filters.semaine ? `Semaine ${filters.semaine}` : "",
    ].filter(Boolean).join(" · ");

    root.innerHTML = `
      <!-- Filter bar -->
      <div class="app-card" style="margin-bottom:16px;">
        <div class="card-header" style="margin-bottom:0;">
          <div class="card-title">Période — ${escapeHtml(periodLabel)}</div>
          <div class="flex flex-wrap items-center gap-2.5">
            <select class="filter-select" data-f="annee" title="Année">
              ${yearOptions.map(y => `<option value="${y}" ${filters.annee === y ? "selected" : ""}>${y}</option>`).join("")}
            </select>
            <select class="filter-select" data-f="mois" title="Mois">
              <option value="">Tous les mois</option>
              ${MOIS_FULL.map((label, i) => `<option value="${i + 1}" ${filters.mois == i + 1 ? "selected" : ""}>${label}</option>`).join("")}
            </select>
            <select class="filter-select" data-f="semaine" title="Semaine ISO">
              <option value="">Toutes les semaines</option>
              ${weekOptions.map(w => `<option value="${w}" ${filters.semaine == w ? "selected" : ""}>S${w}</option>`).join("")}
            </select>
            ${(filters.mois || filters.semaine || filters.annee !== currentYear)
              ? `<button class="btn-icon" data-action="reset" title="Réinitialiser">↺</button>` : ""}
          </div>
        </div>
      </div>

      <!-- Summary strip -->
      <div class="stat-strip">
        <div class="strip-item"><div class="strip-val">${fmt.compact(globalCA)}</div><div class="strip-label">CA Total FCFA (toutes années)</div></div>
        <div class="strip-item"><div class="strip-val">${globalBL.toLocaleString("fr-FR")}</div><div class="strip-label">Expéditions totales</div></div>
        <div class="strip-item"><div class="strip-val">${topClients?.length ? topClients.length + "+" : "—"}</div><div class="strip-label">Clients actifs (top)</div></div>
        <div class="strip-item">
          <div class="strip-val">${kpiCurrent?.taux_marge_moyen != null ? (kpiCurrent.taux_marge_moyen * 100).toFixed(1) + "%" : "—"}</div>
          <div class="strip-label">Taux de marge moyen (${yr})</div>
        </div>
        <div class="strip-item"><div class="strip-val">${nbAnnees}</div><div class="strip-label">Années d'activité</div></div>
      </div>

      <!-- KPI cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div class="kpi-card">
          <div class="kpi-label">Chiffre d'Affaires ${yr}${filters.mois ? " · " + MOIS_LABELS[filters.mois - 1] : ""}</div>
          <div class="kpi-value">${fmt.compact(kpiCurrent?.ca_total)} <span class="kpi-sub">FCFA</span></div>
          ${kpiCurrent && kpiPrev ? `<div class="kpi-delta ${deltaCls(kpiCurrent.ca_total, kpiPrev.ca_total)}">${delta(kpiCurrent.ca_total, kpiPrev.ca_total)} vs ${yr - 1}</div>` : ""}
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Expéditions ${yr}${filters.mois ? " · " + MOIS_LABELS[filters.mois - 1] : ""}</div>
          <div class="kpi-value">${kpiCurrent?.nb_bl ?? "—"} <span class="kpi-sub">B/L</span></div>
          ${kpiCurrent && kpiPrev ? `<div class="kpi-delta ${deltaCls(kpiCurrent.nb_bl, kpiPrev.nb_bl)}">${delta(kpiCurrent.nb_bl, kpiPrev.nb_bl)} vs ${yr - 1}</div>` : ""}
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Volume ${yr}${filters.mois ? " · " + MOIS_LABELS[filters.mois - 1] : ""}</div>
          <div class="kpi-value">${kpiCurrent?.volume_m3 ? kpiCurrent.volume_m3.toFixed(0) : "—"} <span class="kpi-sub">M³</span></div>
          ${kpiCurrent && kpiPrev?.volume_m3 ? `<div class="kpi-delta ${deltaCls(kpiCurrent.volume_m3, kpiPrev.volume_m3)}">${delta(kpiCurrent.volume_m3, kpiPrev.volume_m3)} vs ${yr - 1}</div>` : ""}
        </div>
        <div class="kpi-card">
          <div class="kpi-label">CA Moy / Expédition ${yr}</div>
          <div class="kpi-value">${fmt.compact(kpiCurrent?.ca_moy_par_bl)} <span class="kpi-sub">FCFA</span></div>
          <div class="kpi-delta neutral">↑ Qualité dossiers</div>
        </div>
      </div>

      ${compta ? `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div class="kpi-card" style="border-color:rgba(99,153,34,0.3);">
          <div class="kpi-label">Recettes ${yr}${filters.semaine ? " · S" + filters.semaine : (filters.mois ? " · " + MOIS_LABELS[filters.mois - 1] : "")}</div>
          <div class="kpi-value" style="color:var(--green); font-size:16px;">${fmt.compact(compta.total_recettes)} <span class="kpi-sub">FCFA</span></div>
          <div class="kpi-delta up">↑ ${compta.nb_recettes} opération(s)</div>
        </div>
        <div class="kpi-card" style="border-color:rgba(226,75,74,0.3);">
          <div class="kpi-label">Dépenses ${yr}${filters.semaine ? " · S" + filters.semaine : (filters.mois ? " · " + MOIS_LABELS[filters.mois - 1] : "")}</div>
          <div class="kpi-value" style="color:var(--red); font-size:16px;">${fmt.compact(compta.total_depenses)} <span class="kpi-sub">FCFA</span></div>
          <div class="kpi-delta down">↓ ${compta.nb_depenses} opération(s)</div>
        </div>
        <div class="kpi-card" style="border-color:${compta.resultat_net >= 0 ? "rgba(99,153,34,0.3)" : "rgba(226,75,74,0.3)"};">
          <div class="kpi-label">Résultat net ${yr}</div>
          <div class="kpi-value" style="font-size:16px; color:${compta.resultat_net >= 0 ? "var(--green)" : "var(--red)"};">
            ${fmt.compact(compta.resultat_net)} <span class="kpi-sub">FCFA</span>
          </div>
          <div class="kpi-delta neutral">Recettes − Dépenses</div>
        </div>
        <div class="kpi-card" style="border-color:rgba(239,159,39,0.3);">
          <div class="kpi-label">Paiements en attente</div>
          <div class="kpi-value" style="color:#EF9F27; font-size:16px;">${fmt.compact(compta.montant_en_attente)} <span class="kpi-sub">FCFA</span></div>
          <div class="kpi-delta neutral">${compta.nb_en_attente} facture(s) non réglée(s)</div>
        </div>
      </div>` : ""}

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <div class="app-card">
          <div class="card-header"><div class="card-title">Évolution du CA — toutes années</div><span class="card-badge">Annuel</span></div>
          <div id="ca-chart" style="min-height:240px;"></div>
        </div>
        <div class="app-card">
          <div class="card-header"><div class="card-title">Nombre d'expéditions / an</div><span class="card-badge">B/L émis</span></div>
          <div id="bl-chart" style="min-height:240px;"></div>
        </div>
      </div>

      <!-- Heatmap + donut -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div class="app-card lg:col-span-2">
          <div class="card-header"><div class="card-title">CA mensuel — heatmap</div><span class="card-badge">${heatYears[0]}–${heatYears[heatYears.length - 1]}</span></div>
          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:10px;">
              <thead>
                <tr>
                  <th style="color:var(--text3); padding:3px; text-align:left; min-width:30px;"></th>
                  ${heatYears.map(y => `<th style="color:${y === yr ? "var(--gold2)" : "var(--text2)"}; padding:3px; text-align:center; font-weight:${y === yr ? 600 : 500}; min-width:50px;">${y}${y === yr ? " ●" : ""}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${MOIS_LABELS.map((label, idx) => `
                  <tr>
                    <td style="color:var(--text3); padding:3px 6px; white-space:nowrap;">${label}</td>
                    ${heatYears.map(y => {
                      const v = heatmapMap[y]?.[idx + 1] ?? 0;
                      const display = v > 0 ? (v / 1e6).toFixed(1) : "—";
                      return `<td style="${heatCellStyle(idx + 1, y)}" title="${label} ${y} : ${v.toLocaleString("fr-FR")} FCFA">${display}</td>`;
                    }).join("")}
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
        <div class="app-card">
          <div class="card-header"><div class="card-title">Top 5 Clients</div><span class="card-badge">${yr}</span></div>
          <div id="donut-chart" style="min-height:260px;"></div>
        </div>
      </div>

      <!-- Top clients table -->
      <div class="app-card">
        <div class="card-header"><div class="card-title">Top Consignataires — CA ${yr}</div><span class="card-badge">${topClients?.length || 0} clients</span></div>
        <table class="data-table w-full">
          <thead><tr><th>#</th><th>CLIENT</th><th>CA TOTAL</th><th>B/L</th><th>PART %</th><th>PERFORMANCE</th></tr></thead>
          <tbody>
            ${!topClients?.length ? `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--text3);">Aucune donnée client</td></tr>`
              : topClients.map((c, i) => {
                const pct = totalCliCA ? ((c.ca_total / totalCliCA) * 100).toFixed(1) + "%" : "—";
                const barW = topClients[0]?.ca_total ? ((c.ca_total / topClients[0].ca_total) * 100).toFixed(0) + "%" : "0%";
                return `
                  <tr>
                    <td><span class="rank-badge ${i < 3 ? `t${i + 1}` : ""}">${i + 1}</span></td>
                    <td style="color:var(--text); font-weight:500;">${escapeHtml(c.nom)}</td>
                    <td class="gold-text" style="font-family:'DM Mono',monospace;">${fmt.compact(c.ca_total)} FCFA</td>
                    <td style="color:var(--text2);">${c.nb_bl}</td>
                    <td style="color:var(--text3);">${pct}</td>
                    <td style="min-width:120px;">
                      <div class="progress-bar"><div class="progress-fill" style="width:${barW}"></div></div>
                    </td>
                  </tr>`;
              }).join("")}
          </tbody>
        </table>
      </div>
    `;

    // Wire filter bar
    root.querySelectorAll("[data-f]").forEach(el => {
      el.addEventListener("change", () => {
        const k = el.getAttribute("data-f");
        filters[k] = el.value === "" ? "" : Number(el.value);
        // If year changes, week numbering may shift — clamp
        if (k === "annee" && filters.semaine) {
          const max = isoWeeksInYear(filters.annee);
          if (filters.semaine > max) filters.semaine = "";
        }
        syncQuery();
        load();
      });
    });
    const resetBtn = root.querySelector('[data-action="reset"]');
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        filters.annee = currentYear;
        filters.mois = "";
        filters.semaine = "";
        syncQuery();
        load();
      });
    }

    // Mount charts
    if (caAnnuel?.length) {
      const c = new ApexCharts(document.getElementById("ca-chart"), {
        chart: { type: "area", height: 240, background: "transparent", toolbar: { show: false }, fontFamily: "DM Sans, sans-serif" },
        theme: { mode: "dark" },
        colors: ["#e8b87a"],
        stroke: { curve: "smooth", width: 2 },
        fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.18, opacityTo: 0.01, stops: [0, 100] } },
        dataLabels: { enabled: false },
        markers: { size: 4, colors: ["#c9975a"], strokeWidth: 0, hover: { size: 7 } },
        grid: GRID,
        xaxis: { categories: caAnnuel.map(r => String(r.annee)), labels: AXIS_LABELS, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { ...AXIS_LABELS, formatter: (v) => fmt.compact(v) } },
        tooltip: { theme: "dark", y: { formatter: (v) => fmt.compact(v) + " FCFA" } },
        series: [{ name: "CA FCFA", data: caAnnuel.map(r => r.ca) }],
      });
      c.render();
      charts.push(c);

      const c2 = new ApexCharts(document.getElementById("bl-chart"), {
        chart: { type: "bar", height: 240, background: "transparent", toolbar: { show: false }, fontFamily: "DM Sans, sans-serif" },
        theme: { mode: "dark" },
        colors: ["#c9975a"],
        plotOptions: { bar: { borderRadius: 4, columnWidth: "60%", distributed: true } },
        dataLabels: { enabled: false },
        legend: { show: false },
        grid: GRID,
        xaxis: { categories: caAnnuel.map(r => String(r.annee)), labels: AXIS_LABELS, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: AXIS_LABELS },
        tooltip: { theme: "dark", y: { formatter: (v) => v + " B/L" } },
        series: [{ name: "B/L", data: caAnnuel.map(r => r.nb_bl) }],
      });
      c2.render();
      charts.push(c2);
    }

    if (topClients?.length) {
      const top5 = topClients.slice(0, 5);
      const c = new ApexCharts(document.getElementById("donut-chart"), {
        chart: { type: "donut", height: 260, background: "transparent", fontFamily: "DM Sans, sans-serif" },
        theme: { mode: "dark" },
        colors: ["#c9975a", "#e8b87a", "#60a5fa", "#2dd4bf", "#4ade80"],
        labels: top5.map(c => c.nom.length > 18 ? c.nom.slice(0, 18) + "…" : c.nom),
        legend: { show: true, position: "bottom", labels: { colors: "#9fa3ad" }, fontSize: "10px" },
        plotOptions: { pie: { donut: { size: "65%" } } },
        dataLabels: { enabled: false },
        tooltip: { theme: "dark", y: { formatter: (v) => fmt.compact(v) + " FCFA" } },
        series: top5.map(c => c.ca_total),
      });
      c.render();
      charts.push(c);
    }
  }

  await load();
  return () => destroyCharts();
}
