<script setup lang="ts">
import type { Paginated, AuditEntree, TypeAudit, StatutAudit, Conformite, Priorite } from "~/types/api";

const { get, post, put, del } = useApi();

const TYPE_AUDITS: TypeAudit[]  = ["INTERNE","EXTERNE","FISCAL","SOCIAL","OPERATIONNEL","INFORMATIQUE","QUALITE"];
const STATUTS: StatutAudit[]    = ["PLANIFIÉ","EN COURS","TERMINÉ","SUIVI","CLOS"];
const CONFORMITES: Conformite[] = ["CONFORME","NON_CONFORME","PARTIEL","N/A"];
const PRIORITES: Priorite[]     = ["P1","P2","P3"];

// ── Filtres ───────────────────────────────────────────────────────────────────
const annee     = ref<number>(new Date().getFullYear());
const typeAudit = ref<string>("");
const statut    = ref<string>("");
const priorite  = ref<string>("");
const page      = ref(1);

const params = computed(() => {
  const p: Record<string, string | number> = { page: page.value, page_size: 30 };
  if (annee.value)    p.annee      = annee.value;
  if (typeAudit.value) p.type_audit = typeAudit.value;
  if (statut.value)   p.statut     = statut.value;
  if (priorite.value) p.priorite   = priorite.value;
  return p;
});
watch(params, () => { page.value = 1; }, { deep: true });

const { data, pending, refresh } = useAsyncData(
  "audit",
  () => get<Paginated<AuditEntree>>("/api/audit/", { params: params.value }),
  { watch: [params] },
);

// ── KPIs ──────────────────────────────────────────────────────────────────────
const kpis = computed(() => {
  const items = data.value?.items ?? [];
  return {
    total:    data.value?.total ?? 0,
    en_cours: items.filter(a => a.statut === "EN COURS").length,
    conformes: items.filter(a => a.conformite === "CONFORME").length,
    p1:       items.filter(a => a.priorite === "P1").length,
  };
});

// ── Formulaire ────────────────────────────────────────────────────────────────
const modalOpen = ref(false);
const editId    = ref<number | null>(null);
const saving    = ref(false);
const formError = ref("");

const empty = () => ({
  reference:      "",
  date_audit:     new Date().toISOString().slice(0, 10),
  auditeur:       "",
  type_audit:     "INTERNE" as TypeAudit,
  domaine:        "",
  periode_debut:  "",
  periode_fin:    "",
  conformite:     "N/A" as Conformite,
  nb_observations: null as number | null,
  observations:   "",
  recommandations: "",
  plan_action:    "",
  statut:         "PLANIFIÉ" as StatutAudit,
  priorite:       "P2" as Priorite,
  notes:          "",
});
const form = reactive(empty());

function openCreate() {
  Object.assign(form, empty()); editId.value = null; formError.value = ""; modalOpen.value = true;
}
function openEdit(row: AuditEntree) {
  Object.assign(form, {
    reference:       row.reference ?? "",
    date_audit:      row.date_audit,
    auditeur:        row.auditeur ?? "",
    type_audit:      row.type_audit,
    domaine:         row.domaine ?? "",
    periode_debut:   row.periode_debut ?? "",
    periode_fin:     row.periode_fin ?? "",
    conformite:      row.conformite,
    nb_observations: row.nb_observations,
    observations:    row.observations ?? "",
    recommandations: row.recommandations ?? "",
    plan_action:     row.plan_action ?? "",
    statut:          row.statut,
    priorite:        row.priorite,
    notes:           row.notes ?? "",
  });
  editId.value = row.id; formError.value = ""; modalOpen.value = true;
}

async function onSubmit() {
  if (!form.date_audit) { formError.value = "La date est obligatoire."; return; }
  saving.value = true; formError.value = "";
  try {
    const body = {
      reference:       form.reference || null,
      date_audit:      form.date_audit,
      auditeur:        form.auditeur || null,
      type_audit:      form.type_audit,
      domaine:         form.domaine || null,
      periode_debut:   form.periode_debut  || null,
      periode_fin:     form.periode_fin    || null,
      conformite:      form.conformite,
      nb_observations: form.nb_observations,
      observations:    form.observations    || null,
      recommandations: form.recommandations || null,
      plan_action:     form.plan_action     || null,
      statut:          form.statut,
      priorite:        form.priorite,
      notes:           form.notes || null,
    };
    if (editId.value) await put(`/api/audit/${editId.value}`, body);
    else await post("/api/audit/", body);
    modalOpen.value = false; await refresh();
  } catch (e: unknown) {
    formError.value = (e as { data?: { detail?: string } }).data?.detail ?? "Erreur.";
  } finally { saving.value = false; }
}

const deleteTarget = ref<AuditEntree | null>(null);
async function confirmDelete() {
  if (!deleteTarget.value) return;
  try { await del(`/api/audit/${deleteTarget.value.id}`); deleteTarget.value = null; await refresh(); }
  catch { deleteTarget.value = null; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CONFORMITE_STYLES: Record<string, string> = {
  "CONFORME":     "background:rgba(99,153,34,0.15);  color:#639922; border:1px solid rgba(99,153,34,0.3);",
  "NON_CONFORME": "background:rgba(226,75,74,0.12);  color:#E24B4A; border:1px solid rgba(226,75,74,0.3);",
  "PARTIEL":      "background:rgba(239,159,39,0.12); color:#EF9F27; border:1px solid rgba(239,159,39,0.3);",
  "N/A":          "background:rgba(120,120,130,0.1);  color:#888;    border:1px solid rgba(120,120,130,0.2);",
};
const STATUT_STYLES: Record<string, string> = {
  "PLANIFIÉ":  "background:rgba(74,222,128,0.1);  color:#4ade80; border:1px solid rgba(74,222,128,0.25);",
  "EN COURS":  "background:rgba(29,158,117,0.12); color:#1D9E75; border:1px solid rgba(29,158,117,0.3);",
  "TERMINÉ":   "background:rgba(99,153,34,0.15);  color:#639922; border:1px solid rgba(99,153,34,0.3);",
  "SUIVI":     "background:rgba(201,151,90,0.12); color:var(--gold2); border:1px solid rgba(201,151,90,0.25);",
  "CLOS":      "background:rgba(120,120,130,0.1);  color:#888;    border:1px solid rgba(120,120,130,0.2);",
};
const PRIORITE_STYLES: Record<string, string> = {
  "P1": "background:rgba(226,75,74,0.12); color:#E24B4A; border:1px solid rgba(226,75,74,0.3);",
  "P2": "background:rgba(239,159,39,0.12); color:#EF9F27; border:1px solid rgba(239,159,39,0.3);",
  "P3": "background:rgba(120,120,130,0.1); color:#888; border:1px solid rgba(120,120,130,0.2);",
};
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
      <select v-model="typeAudit" class="filter-select">
        <option value="">Tous types</option>
        <option v-for="t in TYPE_AUDITS" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-model="statut" class="filter-select">
        <option value="">Tous statuts</option>
        <option v-for="s in STATUTS" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="priorite" class="filter-select" style="width:100px;">
        <option value="">Toutes priorités</option>
        <option v-for="p in PRIORITES" :key="p" :value="p">{{ p }}</option>
      </select>
    </div>

    <!-- ── KPIs ───────────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-4 gap-4">
      <div class="kpi-card">
        <div class="kpi-label">Missions d'audit</div>
        <div class="kpi-value">{{ kpis.total }}</div>
        <div class="kpi-delta neutral">Total {{ annee }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">En cours</div>
        <div class="kpi-value" style="color:var(--secondary);">{{ kpis.en_cours }}</div>
        <div class="kpi-delta neutral">Missions actives</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Conformes</div>
        <div class="kpi-value" style="color:var(--green);">{{ kpis.conformes }}</div>
        <div class="kpi-delta up">↑ Sans observation critique</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Priorité P1</div>
        <div class="kpi-value" style="color:var(--danger);">{{ kpis.p1 }}</div>
        <div class="kpi-delta down">↓ Urgences</div>
      </div>
    </div>

    <!-- ── Tableau ────────────────────────────────────────────────────────── -->
    <div class="app-card flex flex-col gap-4">
      <div class="card-header" style="margin-bottom:0;">
        <div class="card-title">Registre des audits</div>
        <div class="flex items-center gap-2.5">
          <span class="card-badge">{{ data?.total ?? 0 }} entrée(s)</span>
          <button class="btn-primary" style="padding:6px 14px;" @click="openCreate">+ Ajouter</button>
        </div>
      </div>

      <div v-if="pending" class="flex items-center justify-center py-16">
        <div class="spinner" />
      </div>
      <div v-else-if="!data?.items.length" class="text-center py-12" style="color:var(--text3); font-size:13px;">
        Aucune mission d'audit.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Réf.</th>
              <th>Date</th>
              <th>Auditeur</th>
              <th>Type</th>
              <th>Domaine</th>
              <th>Période</th>
              <th>Conformité</th>
              <th>Obs.</th>
              <th>Statut</th>
              <th>Priorité</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.items" :key="row.id">
              <td class="font-mono text-xs">{{ row.reference ?? '—' }}</td>
              <td class="font-mono text-xs">{{ row.date_audit }}</td>
              <td style="font-size:12px;">{{ row.auditeur ?? '—' }}</td>
              <td>
                <span class="badge" style="background:rgba(201,151,90,0.12); color:var(--gold2); border:1px solid rgba(201,151,90,0.25); font-size:10px;">
                  {{ row.type_audit }}
                </span>
              </td>
              <td style="font-size:12px; color:var(--text2);">{{ row.domaine ?? '—' }}</td>
              <td class="font-mono text-xs" style="color:var(--text3);">
                {{ row.periode_debut ?? '—' }} → {{ row.periode_fin ?? '—' }}
              </td>
              <td>
                <span class="badge" :style="CONFORMITE_STYLES[row.conformite] ?? ''" style="font-size:10px;">
                  {{ row.conformite }}
                </span>
              </td>
              <td class="text-right font-mono text-xs">{{ row.nb_observations ?? '—' }}</td>
              <td>
                <span class="badge" :style="STATUT_STYLES[row.statut] ?? ''" style="font-size:10px;">
                  {{ row.statut }}
                </span>
              </td>
              <td>
                <span class="badge" :style="PRIORITE_STYLES[row.priorite] ?? ''" style="font-size:10px;">
                  {{ row.priorite }}
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
      <div v-if="(data?.pages ?? 0) > 1" class="flex items-center justify-between">
        <span class="text-[12px]" style="color:var(--text3);">Page {{ page }} / {{ data?.pages }}</span>
        <div class="flex gap-2">
          <button class="btn-ghost" :disabled="page <= 1" @click="page--">← Préc.</button>
          <button class="btn-ghost" :disabled="page >= (data?.pages ?? 1)" @click="page++">Suiv. →</button>
        </div>
      </div>
    </div>

    <!-- ── Modal ──────────────────────────────────────────────────────────── -->
    <UiModal
      :open="modalOpen"
      :title="editId ? 'Modifier la mission' : 'Nouvelle mission d\'audit'"
      @close="modalOpen = false"
    >
      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label">Référence</label>
            <input v-model="form.reference" class="form-input" placeholder="AUD-2026-001 (auto si vide)" />
          </div>
          <div class="form-group">
            <label class="form-label">Date d'audit <span style="color:var(--danger);">*</span></label>
            <input v-model="form.date_audit" type="date" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">Auditeur</label>
            <input v-model="form.auditeur" class="form-input" placeholder="Nom de l'auditeur" />
          </div>
          <div class="form-group">
            <label class="form-label">Type d'audit</label>
            <select v-model="form.type_audit" class="form-input">
              <option v-for="t in TYPE_AUDITS" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Domaine</label>
            <input v-model="form.domaine" class="form-input" placeholder="Comptabilité, RH, IT…" />
          </div>
          <div class="form-group">
            <label class="form-label">Nb. observations</label>
            <input v-model.number="form.nb_observations" type="number" class="form-input" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">Période début</label>
            <input v-model="form.periode_debut" type="date" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Période fin</label>
            <input v-model="form.periode_fin" type="date" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Conformité</label>
            <select v-model="form.conformite" class="form-input">
              <option v-for="c in CONFORMITES" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Statut</label>
            <select v-model="form.statut" class="form-input">
              <option v-for="s in STATUTS" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="form-group col-span-2">
            <label class="form-label">Priorité</label>
            <div class="flex gap-3">
              <label
                v-for="p in PRIORITES" :key="p"
                class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg transition-all"
                :style="form.priorite === p ? PRIORITE_STYLES[p] : 'background:var(--bg3); border:1px solid var(--border2); color:var(--text2);'"
              >
                <input v-model="form.priorite" type="radio" :value="p" class="hidden" />
                {{ p }}
              </label>
            </div>
          </div>
          <div class="form-group col-span-2">
            <label class="form-label">Observations</label>
            <textarea v-model="form.observations" class="form-input" rows="3" style="resize:vertical;" placeholder="Constats et observations de l'auditeur…" />
          </div>
          <div class="form-group col-span-2">
            <label class="form-label">Recommandations</label>
            <textarea v-model="form.recommandations" class="form-input" rows="3" style="resize:vertical;" placeholder="Actions recommandées…" />
          </div>
          <div class="form-group col-span-2">
            <label class="form-label">Plan d'action</label>
            <textarea v-model="form.plan_action" class="form-input" rows="3" style="resize:vertical;" placeholder="Mesures correctives planifiées…" />
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
      :label="deleteTarget?.reference ?? 'cette mission'"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />

  </div>
</template>
