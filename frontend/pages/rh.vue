<script setup lang="ts">
import type { Paginated, Employe, PerformanceRH, EmployeStatut, Departement } from "~/types/api";

const { get, post, put, del } = useApi();
const fmt = useFormat();

const DEPARTEMENTS: Departement[] = ["DIRECTION","COMMERCIAL","OPERATIONS","FINANCE","RH","INFORMATIQUE","LOGISTIQUE","DIVERS"];

// ── Employés ──────────────────────────────────────────────────────────────────
const empCols = [
  { key: "matricule",       label: "Matricule",    class: "font-mono text-xs w-24" },
  { key: "nom",             label: "Nom"           },
  { key: "prenom",          label: "Prénom"        },
  { key: "poste",           label: "Poste"         },
  { key: "departement",     label: "Département"   },
  { key: "statut",          label: "Statut"        },
  { key: "salaire_base_fcfa", label: "Salaire base" },
  { key: "date_embauche",   label: "Embauche"      },
];

const page    = ref(1);
const filters = useFilters({ search: "", departement: "", statut: "" });
watch(filters, () => { page.value = 1; }, { deep: true });

const queryParams = computed(() => {
  const p: Record<string, string|number> = { page: page.value, page_size: 20 };
  if (filters.search)      p.search      = filters.search;
  if (filters.departement) p.departement = filters.departement;
  if (filters.statut)      p.statut      = filters.statut;
  return p;
});

const { data: empData, pending: empPending, refresh: refreshEmp } = useAsyncData(
  "employes",
  () => get<Paginated<Employe>>("/api/employes/", { params: queryParams.value }),
  { watch: [queryParams] },
);

// ── Performances ──────────────────────────────────────────────────────────────
const perfCols = [
  { key: "employe_id",          label: "Emp. ID",    class: "font-mono text-xs w-20" },
  { key: "annee",               label: "Année"       },
  { key: "nb_dossiers_traites", label: "Dossiers"    },
  { key: "ca_genere_fcfa",      label: "CA généré"   },
  { key: "objectif_ca_fcfa",    label: "Objectif CA" },
  { key: "taux_realisation",    label: "Réalisation" },
  { key: "nb_clients_nouveaux", label: "Nouveaux cli." },
  { key: "prime_fcfa",          label: "Prime"       },
  { key: "evaluation",          label: "Éval."       },
];

const perfYear   = ref<number | undefined>(new Date().getFullYear());
const perfEmpId  = ref<number | undefined>(undefined);
const perfPage   = ref(1);

const perfParams = computed(() => {
  const p: Record<string, string|number> = { page: perfPage.value, page_size: 50 };
  if (perfYear.value)  p.annee      = perfYear.value;
  if (perfEmpId.value) p.employe_id = perfEmpId.value;
  return p;
});

const { data: perfData, pending: perfPending, refresh: refreshPerf } = useAsyncData(
  "performances",
  () => get<Paginated<PerformanceRH>>("/api/performances/", { params: perfParams.value }),
  { watch: [perfParams] },
);

// ── Tab ───────────────────────────────────────────────────────────────────────
const tab = ref<"employes"|"performances">("employes");

// ── Formulaire Employé ────────────────────────────────────────────────────────
const empModalOpen = ref(false);
const empEditId    = ref<number | null>(null);
const empSaving    = ref(false);
const empError     = ref("");

const empEmpty = () => ({
  matricule: "", nom: "", prenom: "", poste: "",
  departement: "COMMERCIAL" as Departement,
  email: "", telephone: "", date_embauche: "",
  salaire_base_fcfa: null as number | null,
  statut: "ACTIF" as EmployeStatut,
  notes: "",
});
const empForm = reactive(empEmpty());

function openEmpCreate() {
  Object.assign(empForm, empEmpty()); empEditId.value = null; empError.value = ""; empModalOpen.value = true;
}
function openEmpEdit(row: Employe) {
  Object.assign(empForm, {
    matricule: row.matricule ?? "", nom: row.nom, prenom: row.prenom ?? "",
    poste: row.poste ?? "", departement: row.departement,
    email: row.email ?? "", telephone: row.telephone ?? "",
    date_embauche: row.date_embauche ?? "",
    salaire_base_fcfa: row.salaire_base_fcfa,
    statut: row.statut, notes: row.notes ?? "",
  });
  empEditId.value = row.id; empError.value = ""; empModalOpen.value = true;
}

async function onEmpSubmit() {
  if (!empForm.nom.trim()) { empError.value = "Le nom est obligatoire."; return; }
  empSaving.value = true; empError.value = "";
  try {
    const body = {
      matricule: empForm.matricule || null, nom: empForm.nom.trim(), prenom: empForm.prenom || null,
      poste: empForm.poste || null, departement: empForm.departement,
      email: empForm.email || null, telephone: empForm.telephone || null,
      date_embauche: empForm.date_embauche || null,
      salaire_base_fcfa: empForm.salaire_base_fcfa || null,
      statut: empForm.statut, notes: empForm.notes || null,
    };
    if (empEditId.value) await put(`/api/employes/${empEditId.value}`, body);
    else await post("/api/employes/", body);
    empModalOpen.value = false; await refreshEmp();
  } catch (e: unknown) {
    empError.value = (e as { data?: { detail?: string } }).data?.detail ?? "Erreur.";
  } finally { empSaving.value = false; }
}

const empDeleteTarget = ref<Employe | null>(null);
async function confirmEmpDelete() {
  if (!empDeleteTarget.value) return;
  try { await del(`/api/employes/${empDeleteTarget.value.id}`); empDeleteTarget.value = null; await refreshEmp(); }
  catch { empDeleteTarget.value = null; }
}

// ── Formulaire Performance ────────────────────────────────────────────────────
const perfModalOpen = ref(false);
const perfEditId    = ref<number | null>(null);
const perfSaving    = ref(false);
const perfError     = ref("");

const perfEmpty = () => ({
  employe_id: null as number | null, annee: new Date().getFullYear(),
  nb_dossiers_traites: null as number | null, ca_genere_fcfa: null as number | null,
  objectif_ca_fcfa: null as number | null, taux_realisation: null as number | null,
  nb_clients_nouveaux: null as number | null, nb_reclamations: null as number | null,
  prime_fcfa: null as number | null, evaluation: null as number | null, commentaires: "",
});
const perfForm = reactive(perfEmpty());

function openPerfCreate() {
  Object.assign(perfForm, perfEmpty()); perfEditId.value = null; perfError.value = ""; perfModalOpen.value = true;
}
function openPerfEdit(row: PerformanceRH) {
  Object.assign(perfForm, { ...row, commentaires: row.commentaires ?? "" });
  perfEditId.value = row.id; perfError.value = ""; perfModalOpen.value = true;
}

async function onPerfSubmit() {
  if (!perfForm.employe_id) { perfError.value = "L'ID employé est obligatoire."; return; }
  perfSaving.value = true; perfError.value = "";
  try {
    const body = { ...perfForm, commentaires: perfForm.commentaires || null };
    if (perfEditId.value) await put(`/api/performances/${perfEditId.value}`, body);
    else await post("/api/performances/", body);
    perfModalOpen.value = false; await refreshPerf();
  } catch (e: unknown) {
    perfError.value = (e as { data?: { detail?: string } }).data?.detail ?? "Erreur.";
  } finally { perfSaving.value = false; }
}

const perfDeleteTarget = ref<PerformanceRH | null>(null);
async function confirmPerfDelete() {
  if (!perfDeleteTarget.value) return;
  try { await del(`/api/performances/${perfDeleteTarget.value.id}`); perfDeleteTarget.value = null; await refreshPerf(); }
  catch { perfDeleteTarget.value = null; }
}
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- KPIs RH -->
    <div class="grid grid-cols-4 gap-4">
      <div class="kpi-card">
        <div class="kpi-label">Effectif total</div>
        <div class="kpi-value">{{ empData?.total ?? '—' }}</div>
        <div class="kpi-delta neutral">Tous statuts</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Actifs</div>
        <div class="kpi-value">
          {{ empData?.items.filter(e => e.statut === 'ACTIF').length ?? '—' }}
        </div>
        <div class="kpi-delta up">↑ En poste</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Départements</div>
        <div class="kpi-value">{{ new Set(empData?.items.map(e => e.departement)).size || '—' }}</div>
        <div class="kpi-delta neutral">Pôles actifs</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Évaluations {{ new Date().getFullYear() }}</div>
        <div class="kpi-value">{{ perfData?.total ?? '—' }}</div>
        <div class="kpi-delta neutral">Performances saisies</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2">
      <button
        class="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
        :style="tab === 'employes' ? 'background:var(--goldl); border:1px solid var(--border); color:var(--gold2);' : 'background:var(--bg3); border:1px solid var(--border2); color:var(--text2);'"
        @click="tab = 'employes'"
      >Effectifs</button>
      <button
        class="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
        :style="tab === 'performances' ? 'background:var(--goldl); border:1px solid var(--border); color:var(--gold2);' : 'background:var(--bg3); border:1px solid var(--border2); color:var(--text2);'"
        @click="tab = 'performances'"
      >Performances annuelles</button>
    </div>

    <!-- Employés -->
    <div v-if="tab === 'employes'" class="app-card flex flex-col gap-4">
      <div class="card-header" style="margin-bottom:0;">
        <div class="card-title">Effectifs</div>
        <div class="flex items-center gap-2.5">
          <input v-model="filters.search" class="filter-select" style="width:180px;" placeholder="Rechercher…" />
          <select v-model="filters.departement" class="filter-select">
            <option value="">Tous les départements</option>
            <option v-for="d in DEPARTEMENTS" :key="d" :value="d">{{ d }}</option>
          </select>
          <select v-model="filters.statut" class="filter-select">
            <option value="">Tous statuts</option>
            <option value="ACTIF">Actif</option>
            <option value="INACTIF">Inactif</option>
            <option value="CONGÉ">Congé</option>
            <option value="SUSPENDU">Suspendu</option>
          </select>
          <span class="card-badge">{{ empData?.total ?? 0 }} employé(s)</span>
          <button class="btn-primary" style="padding:6px 14px;" @click="openEmpCreate">+ Ajouter</button>
        </div>
      </div>
      <TablesDataTable
        :columns="empCols" :rows="empData?.items ?? []" :loading="empPending"
        :total="empData?.total ?? 0" :page="page" :page-size="20" :pages="empData?.pages ?? 0"
        @page-change="page = $event"
      >
        <template #cell-statut="{ value }"><UiStatutBadge :statut="String(value)" /></template>
        <template #cell-salaire_base_fcfa="{ value }">
          <span class="gold-text font-mono text-xs">{{ fmt.fcfa(value as number | null) }}</span>
        </template>
        <template #cell-departement="{ value }">
          <span style="font-size:11px; color:var(--text2);">{{ value }}</span>
        </template>
        <template #actions="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <button class="btn-icon" @click="openEmpEdit(row as Employe)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon danger" @click="empDeleteTarget = (row as Employe)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </template>
      </TablesDataTable>
    </div>

    <!-- Performances -->
    <div v-if="tab === 'performances'" class="app-card flex flex-col gap-4">
      <div class="card-header" style="margin-bottom:0;">
        <div class="card-title">Performances annuelles</div>
        <div class="flex items-center gap-2.5">
          <input v-model.number="perfYear" class="filter-select" type="number" style="width:90px;" placeholder="Année" />
          <input v-model.number="perfEmpId" class="filter-select" type="number" style="width:120px;" placeholder="ID Employé" />
          <span class="card-badge">{{ perfData?.total ?? 0 }} enregistrement(s)</span>
          <button class="btn-primary" style="padding:6px 14px;" @click="openPerfCreate">+ Ajouter</button>
        </div>
      </div>
      <TablesDataTable
        :columns="perfCols" :rows="perfData?.items ?? []" :loading="perfPending"
        :total="perfData?.total ?? 0" :page="perfPage" :page-size="50" :pages="perfData?.pages ?? 0"
        @page-change="perfPage = $event"
      >
        <template #cell-ca_genere_fcfa="{ value }">
          <span class="gold-text font-mono text-xs">{{ fmt.fcfa(value as number | null) }}</span>
        </template>
        <template #cell-objectif_ca_fcfa="{ value }">
          <span style="color:var(--text2);" class="font-mono text-xs">{{ fmt.fcfa(value as number | null) }}</span>
        </template>
        <template #cell-prime_fcfa="{ value }">
          <span style="color:var(--teal);" class="font-mono text-xs">{{ fmt.fcfa(value as number | null) }}</span>
        </template>
        <template #cell-taux_realisation="{ value }">
          <span :style="{ color: (value as number) >= 1 ? 'var(--green)' : 'var(--red)' }">
            {{ value != null ? ((value as number) * 100).toFixed(0) + '%' : '—' }}
          </span>
        </template>
        <template #cell-evaluation="{ value }">
          <span v-if="value" style="color:var(--gold2);">{{ '★'.repeat(value as number) }}{{ '☆'.repeat(5 - (value as number)) }}</span>
          <span v-else style="color:var(--text3);">—</span>
        </template>
        <template #actions="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <button class="btn-icon" @click="openPerfEdit(row as PerformanceRH)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon danger" @click="perfDeleteTarget = (row as PerformanceRH)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        </template>
      </TablesDataTable>
    </div>
  </div>

  <!-- Modal Employé -->
  <UiModal :open="empModalOpen" :title="empEditId ? 'Modifier l\'employé' : 'Nouvel employé'" @close="empModalOpen = false">
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Matricule</label><input v-model="empForm.matricule" class="form-input" placeholder="EMP-001" /></div>
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Statut</label><select v-model="empForm.statut" class="form-input"><option value="ACTIF">Actif</option><option value="INACTIF">Inactif</option><option value="CONGÉ">Congé</option><option value="SUSPENDU">Suspendu</option></select></div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Nom <span style="color:var(--red);">*</span></label><input v-model="empForm.nom" class="form-input" /></div>
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Prénom</label><input v-model="empForm.prenom" class="form-input" /></div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Poste</label><input v-model="empForm.poste" class="form-input" placeholder="Ex: Agent commercial" /></div>
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Département</label><select v-model="empForm.departement" class="form-input"><option v-for="d in DEPARTEMENTS" :key="d" :value="d">{{ d }}</option></select></div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Email</label><input v-model="empForm.email" class="form-input" type="email" /></div>
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Téléphone</label><input v-model="empForm.telephone" class="form-input" /></div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Date d'embauche</label><input v-model="empForm.date_embauche" class="form-input" type="date" /></div>
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Salaire base (FCFA)</label><input v-model.number="empForm.salaire_base_fcfa" class="form-input" type="number" min="0" /></div>
    </div>
    <div class="form-group" style="margin-top:12px;"><label class="form-label">Notes</label><textarea v-model="empForm.notes" class="form-input" rows="2" style="resize:vertical;" /></div>
    <p v-if="empError" class="form-error">{{ empError }}</p>
    <template #footer>
      <button class="btn-ghost" @click="empModalOpen = false">Annuler</button>
      <button class="btn-primary" :disabled="empSaving" @click="onEmpSubmit">{{ empSaving ? 'Enregistrement…' : (empEditId ? 'Mettre à jour' : 'Créer') }}</button>
    </template>
  </UiModal>

  <!-- Modal Performance -->
  <UiModal :open="perfModalOpen" :title="perfEditId ? 'Modifier la performance' : 'Nouvelle performance'" @close="perfModalOpen = false">
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">ID Employé <span style="color:var(--red);">*</span></label><input v-model.number="perfForm.employe_id" class="form-input" type="number" min="1" /></div>
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Année</label><input v-model.number="perfForm.annee" class="form-input" type="number" min="2019" max="2030" /></div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-top:12px;">
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Dossiers traités</label><input v-model.number="perfForm.nb_dossiers_traites" class="form-input" type="number" min="0" /></div>
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Nouveaux clients</label><input v-model.number="perfForm.nb_clients_nouveaux" class="form-input" type="number" min="0" /></div>
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Réclamations</label><input v-model.number="perfForm.nb_reclamations" class="form-input" type="number" min="0" /></div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">CA généré (FCFA)</label><input v-model.number="perfForm.ca_genere_fcfa" class="form-input" type="number" min="0" /></div>
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Objectif CA (FCFA)</label><input v-model.number="perfForm.objectif_ca_fcfa" class="form-input" type="number" min="0" /></div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Prime (FCFA)</label><input v-model.number="perfForm.prime_fcfa" class="form-input" type="number" min="0" /></div>
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Évaluation (1–5)</label><select v-model.number="perfForm.evaluation" class="form-input"><option :value="null">—</option><option v-for="i in 5" :key="i" :value="i">{{ i }} ★</option></select></div>
    </div>
    <div class="form-group" style="margin-top:12px;"><label class="form-label">Commentaires</label><textarea v-model="perfForm.commentaires" class="form-input" rows="2" style="resize:vertical;" /></div>
    <p v-if="perfError" class="form-error">{{ perfError }}</p>
    <template #footer>
      <button class="btn-ghost" @click="perfModalOpen = false">Annuler</button>
      <button class="btn-primary" :disabled="perfSaving" @click="onPerfSubmit">{{ perfSaving ? 'Enregistrement…' : (perfEditId ? 'Mettre à jour' : 'Créer') }}</button>
    </template>
  </UiModal>

  <UiConfirmDelete :open="!!empDeleteTarget" :label="empDeleteTarget ? `${empDeleteTarget.nom} ${empDeleteTarget.prenom ?? ''}` : ''" @confirm="confirmEmpDelete" @cancel="empDeleteTarget = null" />
  <UiConfirmDelete :open="!!perfDeleteTarget" :label="`performance #${perfDeleteTarget?.id}`" @confirm="confirmPerfDelete" @cancel="perfDeleteTarget = null" />
</template>
