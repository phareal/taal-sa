<script setup lang="ts">
import type { Paginated, Conteneur, ConteneurStats, StatutTC, TypeTC } from "~/types/api";

const { get, post, put, del } = useApi();
const fmt = useFormat();

const TYPE_TC: TypeTC[]   = ["TC20","TC40","TC40HC","TC45","VRAC","AUTRE"];
const STATUTS: StatutTC[] = ["EN COURS","LIVRÉ","BLOQUÉ","EN ATTENTE"];
const PARTENAIRES         = ["BOCS","WACEM","DIAMOND CEMENT","AUTRE"];

// ── Filtres ───────────────────────────────────────────────────────────────────
const annee      = ref<number>(new Date().getFullYear());
const moisNum    = ref<number | undefined>(undefined);
const partenaire = ref<string>("");
const statut     = ref<string>("");
const page       = ref(1);

const baseParams = computed(() => {
  const p: Record<string, string | number> = { annee: annee.value };
  if (moisNum.value)   p.mois_num    = moisNum.value;
  if (partenaire.value) p.partenaire  = partenaire.value;
  if (statut.value)    p.statut      = statut.value;
  return p;
});

watch(baseParams, () => { page.value = 1; });

const listParams = computed(() => ({ ...baseParams.value, page: page.value, page_size: 30 }));

// ── Stats / conteneurs ────────────────────────────────────────────────────────
const { data: statsData, pending: statsPending, refresh: refreshStats } = useAsyncData(
  "conteneurs-stats",
  () => get<ConteneurStats[]>("/api/conteneurs/stats", { params: baseParams.value }),
  { watch: [baseParams] },
);

const { data: listData, pending: listPending, refresh: refreshList } = useAsyncData(
  "conteneurs-list",
  () => get<Paginated<Conteneur>>("/api/conteneurs/", { params: listParams.value }),
  { watch: [listParams] },
);

// ── KPIs calculés depuis stats ────────────────────────────────────────────────
const kpis = computed(() => {
  const rows = statsData.value ?? [];
  return {
    total_tc:   rows.length,
    total_bl:   rows.reduce((s, r) => s + r.nb_bl, 0),
    total_ca:   rows.reduce((s, r) => s + r.ca_total_fcfa, 0),
    total_marge: rows.reduce((s, r) => s + (r.marge_total_fcfa ?? 0), 0),
    total_clients: rows.reduce((s, r) => s + r.nb_clients, 0),
  };
});

// ── Tab ───────────────────────────────────────────────────────────────────────
const tab = ref<"stats" | "liste">("stats");

// ── Formulaire Conteneur ──────────────────────────────────────────────────────
const modalOpen = ref(false);
const editId    = ref<number | null>(null);
const saving    = ref(false);
const formError = ref("");

const empty = () => ({
  numero_tc: "", type_tc: "TC20" as TypeTC,
  partenaire: "" as string,
  annee: new Date().getFullYear(), mois_num: null as number | null,
  mois: "" as string,
  date_arrivee: "" as string,
  port_origine: "" as string, port_destination: "" as string,
  statut: "EN COURS" as StatutTC, notes: "" as string,
  navire_id: null as number | null,
});
const form = reactive(empty());

function openCreate() {
  Object.assign(form, empty()); editId.value = null; formError.value = ""; modalOpen.value = true;
}
function openEdit(row: Conteneur) {
  Object.assign(form, {
    numero_tc: row.numero_tc ?? "", type_tc: row.type_tc,
    partenaire: row.partenaire ?? "",
    annee: row.annee, mois_num: row.mois_num,
    mois: row.mois ?? "",
    date_arrivee: row.date_arrivee ?? "",
    port_origine: row.port_origine ?? "", port_destination: row.port_destination ?? "",
    statut: row.statut, notes: row.notes ?? "",
    navire_id: row.navire_id,
  });
  editId.value = row.id; formError.value = ""; modalOpen.value = true;
}

async function onSubmit() {
  saving.value = true; formError.value = "";
  try {
    const body = {
      numero_tc: form.numero_tc || null,
      type_tc: form.type_tc,
      partenaire: form.partenaire || null,
      annee: form.annee,
      mois_num: form.mois_num || null,
      mois: form.mois || null,
      date_arrivee: form.date_arrivee || null,
      port_origine: form.port_origine || null,
      port_destination: form.port_destination || null,
      statut: form.statut,
      notes: form.notes || null,
      navire_id: form.navire_id,
    };
    if (editId.value) await put(`/api/conteneurs/${editId.value}`, body);
    else await post("/api/conteneurs/", body);
    modalOpen.value = false;
    await Promise.all([refreshStats(), refreshList()]);
  } catch (e: unknown) {
    formError.value = (e as { data?: { detail?: string } }).data?.detail ?? "Erreur.";
  } finally { saving.value = false; }
}

const deleteTarget = ref<Conteneur | null>(null);
async function confirmDelete() {
  if (!deleteTarget.value) return;
  try {
    await del(`/api/conteneurs/${deleteTarget.value.id}`);
    deleteTarget.value = null;
    await Promise.all([refreshStats(), refreshList()]);
  } catch { deleteTarget.value = null; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUT_COLORS: Record<string, string> = {
  "EN COURS":  "background:rgba(74,222,128,0.12); color:#4ade80; border:1px solid rgba(74,222,128,0.3);",
  "LIVRÉ":     "background:rgba(99,153,34,0.15);  color:#639922; border:1px solid rgba(99,153,34,0.3);",
  "BLOQUÉ":    "background:rgba(226,75,74,0.12);  color:#E24B4A; border:1px solid rgba(226,75,74,0.3);",
  "EN ATTENTE":"background:rgba(239,159,39,0.12); color:#EF9F27; border:1px solid rgba(239,159,39,0.3);",
};

function tauxMarge(row: ConteneurStats) {
  if (!row.marge_total_fcfa || !row.ca_total_fcfa) return null;
  return (row.marge_total_fcfa / row.ca_total_fcfa) * 100;
}

const MOIS_LABELS = ["", "Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- ── Filtres ────────────────────────────────────────────────────────── -->
    <div class="app-card flex flex-wrap items-center gap-3" style="padding:12px 16px;">
      <div class="flex items-center gap-2">
        <label class="text-[12px] font-medium" style="color:var(--text3);">Année</label>
        <select v-model="annee" class="filter-select" style="width:90px;">
          <option v-for="y in [2019,2020,2021,2022,2023,2024,2025,2026]" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-[12px] font-medium" style="color:var(--text3);">Mois</label>
        <select v-model="moisNum" class="filter-select" style="width:100px;">
          <option :value="undefined">Tous</option>
          <option v-for="m in 12" :key="m" :value="m">{{ MOIS_LABELS[m] }}</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-[12px] font-medium" style="color:var(--text3);">Partenaire</label>
        <select v-model="partenaire" class="filter-select">
          <option value="">Tous</option>
          <option v-for="p in PARTENAIRES" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-[12px] font-medium" style="color:var(--text3);">Statut</label>
        <select v-model="statut" class="filter-select">
          <option value="">Tous statuts</option>
          <option v-for="s in STATUTS" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <!-- ── KPIs ───────────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-5 gap-4">
      <div class="kpi-card">
        <div class="kpi-label">Conteneurs</div>
        <div class="kpi-value">{{ kpis.total_tc }}</div>
        <div class="kpi-delta neutral">TCs {{ annee }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">B/L total</div>
        <div class="kpi-value">{{ kpis.total_bl }}</div>
        <div class="kpi-delta neutral">Connaissements</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Clients uniques</div>
        <div class="kpi-value">{{ kpis.total_clients }}</div>
        <div class="kpi-delta up">↑ Consignataires</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">CA groupage</div>
        <div class="kpi-value" style="font-size:15px;">{{ fmt.fcfa(kpis.total_ca) }}</div>
        <div class="kpi-delta neutral">Recettes</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Marge totale</div>
        <div class="kpi-value" style="font-size:15px;">{{ fmt.fcfa(kpis.total_marge) }}</div>
        <div class="kpi-delta up">↑ Résultat</div>
      </div>
    </div>

    <!-- ── Tabs ───────────────────────────────────────────────────────────── -->
    <div class="flex gap-2">
      <button
        class="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
        :style="tab === 'stats' ? 'background:var(--goldl); border:1px solid var(--border); color:var(--gold2);' : 'background:var(--bg3); border:1px solid var(--border2); color:var(--text2);'"
        @click="tab = 'stats'"
      >Statistiques par TC</button>
      <button
        class="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
        :style="tab === 'liste' ? 'background:var(--goldl); border:1px solid var(--border); color:var(--gold2);' : 'background:var(--bg3); border:1px solid var(--border2); color:var(--text2);'"
        @click="tab = 'liste'"
      >Gestion des conteneurs</button>
    </div>

    <!-- ── Stats par TC ───────────────────────────────────────────────────── -->
    <div v-if="tab === 'stats'" class="app-card flex flex-col gap-4">
      <div class="card-header" style="margin-bottom:0;">
        <div class="card-title">Rapport par conteneur — {{ annee }}
          <span v-if="moisNum" class="text-[12px] font-normal" style="color:var(--text3);"> · {{ MOIS_LABELS[moisNum] }}</span>
        </div>
        <span class="card-badge">{{ statsData?.length ?? 0 }} TC(s)</span>
      </div>

      <div v-if="statsPending" class="flex items-center justify-center py-16">
        <div class="spinner" />
      </div>
      <div v-else-if="!statsData?.length" class="text-center py-12" style="color:var(--text3); font-size:13px;">
        Aucun conteneur pour cette période.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>N° TC</th>
              <th>Type</th>
              <th>Partenaire</th>
              <th>Mois</th>
              <th>Statut</th>
              <th class="text-right">B/L</th>
              <th class="text-right">Clients</th>
              <th class="text-right">CA total</th>
              <th class="text-right">Marge</th>
              <th class="text-right">Taux</th>
              <th class="text-right">Poids (kg)</th>
              <th class="text-right">Volume (m³)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in statsData" :key="row.conteneur_id">
              <td class="font-mono text-xs">{{ row.numero_tc ?? '—' }}</td>
              <td>
                <span class="badge" style="background:rgba(201,151,90,0.12); color:var(--gold2); border:1px solid rgba(201,151,90,0.25); font-size:10px;">
                  {{ row.type_tc }}
                </span>
              </td>
              <td style="color:var(--text2); font-size:12px;">{{ row.partenaire ?? '—' }}</td>
              <td style="font-size:12px;">{{ row.mois ?? '—' }}</td>
              <td>
                <span class="badge" :style="STATUT_COLORS[row.statut] ?? ''" style="font-size:10px;">
                  {{ row.statut }}
                </span>
              </td>
              <td class="text-right font-mono">{{ row.nb_bl }}</td>
              <td class="text-right font-mono">{{ row.nb_clients }}</td>
              <td class="text-right font-mono text-xs">{{ fmt.fcfa(row.ca_total_fcfa) }}</td>
              <td class="text-right font-mono text-xs" :style="row.marge_total_fcfa && row.marge_total_fcfa > 0 ? 'color:var(--green);' : 'color:var(--text3);'">
                {{ row.marge_total_fcfa != null ? fmt.fcfa(row.marge_total_fcfa) : '—' }}
              </td>
              <td class="text-right font-mono text-xs" :style="(tauxMarge(row) ?? 0) >= 10 ? 'color:var(--green);' : 'color:var(--text3);'">
                {{ tauxMarge(row) != null ? (tauxMarge(row)!.toFixed(1) + '%') : '—' }}
              </td>
              <td class="text-right font-mono text-xs">{{ row.poids_kg ? row.poids_kg.toLocaleString('fr') : '—' }}</td>
              <td class="text-right font-mono text-xs">{{ row.volume_m3 ? row.volume_m3.toLocaleString('fr', { maximumFractionDigits: 2 }) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Liste / CRUD ───────────────────────────────────────────────────── -->
    <div v-if="tab === 'liste'" class="app-card flex flex-col gap-4">
      <div class="card-header" style="margin-bottom:0;">
        <div class="card-title">Conteneurs</div>
        <div class="flex items-center gap-2.5">
          <span class="card-badge">{{ listData?.total ?? 0 }} TC(s)</span>
          <button class="btn-primary" style="padding:6px 14px;" @click="openCreate">+ Ajouter</button>
        </div>
      </div>

      <div v-if="listPending" class="flex items-center justify-center py-16">
        <div class="spinner" />
      </div>
      <div v-else-if="!listData?.items.length" class="text-center py-12" style="color:var(--text3); font-size:13px;">
        Aucun conteneur.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>N° TC</th>
              <th>Type</th>
              <th>Partenaire</th>
              <th>Année</th>
              <th>Mois</th>
              <th>Arrivée</th>
              <th>Origine → Destination</th>
              <th>Statut</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in listData.items" :key="row.id">
              <td class="font-mono text-xs">{{ row.numero_tc ?? '—' }}</td>
              <td>
                <span class="badge" style="background:rgba(201,151,90,0.12); color:var(--gold2); border:1px solid rgba(201,151,90,0.25); font-size:10px;">
                  {{ row.type_tc }}
                </span>
              </td>
              <td style="color:var(--text2); font-size:12px;">{{ row.partenaire ?? '—' }}</td>
              <td>{{ row.annee }}</td>
              <td>{{ row.mois ?? '—' }}</td>
              <td class="font-mono text-xs">{{ row.date_arrivee ?? '—' }}</td>
              <td style="font-size:12px; color:var(--text2);">
                {{ row.port_origine ?? '—' }}
                <span style="color:var(--text3);"> → </span>
                {{ row.port_destination ?? '—' }}
              </td>
              <td>
                <span class="badge" :style="STATUT_COLORS[row.statut] ?? ''" style="font-size:10px;">
                  {{ row.statut }}
                </span>
              </td>
              <td class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button class="btn-icon" title="Modifier" @click="openEdit(row)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="btn-icon danger" title="Supprimer" @click="deleteTarget = row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="(listData?.pages ?? 0) > 1" class="flex items-center justify-between">
        <span class="text-[12px]" style="color:var(--text3);">
          Page {{ page }} / {{ listData?.pages }}
        </span>
        <div class="flex gap-2">
          <button class="btn-ghost" :disabled="page <= 1" @click="page--">← Préc.</button>
          <button class="btn-ghost" :disabled="page >= (listData?.pages ?? 1)" @click="page++">Suiv. →</button>
        </div>
      </div>
    </div>

    <!-- ── Modal Conteneur ────────────────────────────────────────────────── -->
    <UiModal
      :open="modalOpen"
      :title="editId ? 'Modifier le conteneur' : 'Nouveau conteneur'"
      @close="modalOpen = false"
    >
      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label">N° TC</label>
            <input v-model="form.numero_tc" class="form-input" placeholder="TCKU1234567" />
          </div>
          <div class="form-group">
            <label class="form-label">Type TC <span style="color:var(--danger);">*</span></label>
            <select v-model="form.type_tc" class="form-input" required>
              <option v-for="t in TYPE_TC" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Partenaire</label>
            <select v-model="form.partenaire" class="form-input">
              <option value="">—</option>
              <option v-for="p in PARTENAIRES" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Statut</label>
            <select v-model="form.statut" class="form-input">
              <option v-for="s in STATUTS" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Année <span style="color:var(--danger);">*</span></label>
            <input v-model.number="form.annee" type="number" class="form-input" min="2019" max="2030" required />
          </div>
          <div class="form-group">
            <label class="form-label">Mois (n°)</label>
            <select v-model="form.mois_num" class="form-input">
              <option :value="null">—</option>
              <option v-for="m in 12" :key="m" :value="m">{{ MOIS_LABELS[m] }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Date d'arrivée</label>
            <input v-model="form.date_arrivee" type="date" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Port d'origine</label>
            <input v-model="form.port_origine" class="form-input" placeholder="Marseille, Shanghai…" />
          </div>
          <div class="form-group col-span-2">
            <label class="form-label">Port de destination</label>
            <input v-model="form.port_destination" class="form-input" placeholder="Lomé" />
          </div>
          <div class="form-group col-span-2">
            <label class="form-label">Notes</label>
            <textarea v-model="form.notes" class="form-input" rows="2" style="resize:vertical;" />
          </div>
        </div>
        <p v-if="formError" class="form-error">{{ formError }}</p>
      </form>
      <template #footer>
        <button class="btn-ghost" @click="modalOpen = false">Annuler</button>
        <button class="btn-primary" :disabled="saving" @click="onSubmit">
          {{ saving ? 'Enregistrement…' : (editId ? 'Mettre à jour' : 'Créer') }}
        </button>
      </template>
    </UiModal>

    <!-- ── Confirm Delete ─────────────────────────────────────────────────── -->
    <UiConfirmDelete
      :open="!!deleteTarget"
      :label="deleteTarget?.numero_tc ?? 'ce conteneur'"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />

  </div>
</template>
