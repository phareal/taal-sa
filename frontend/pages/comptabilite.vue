<script setup lang="ts">
import type { Paginated, ComptabiliteEntry, ComptaSummary, TypeCompta, StatutCompta } from "~/types/api";

const { get, post, put, del } = useApi();
const fmt = useFormat();

const TYPE_OPS: TypeCompta[]  = ["RECETTE","DEPENSE"];
const STATUTS: StatutCompta[] = ["PAYÉ","EN ATTENTE","PARTIEL","ANNULÉ"];

// ── Filtres ───────────────────────────────────────────────────────────────────
const annee      = ref<number>(new Date().getFullYear());
const typeOp     = ref<string>("");
const statut     = ref<string>("");
const categorie  = ref<string>("");
const page       = ref(1);

const baseParams = computed(() => {
  const p: Record<string, string | number> = { annee: annee.value };
  if (typeOp.value)   p.type_operation   = typeOp.value;
  if (statut.value)   p.statut_paiement  = statut.value;
  if (categorie.value) p.categorie       = categorie.value;
  return p;
});
watch(baseParams, () => { page.value = 1; });

const listParams = computed(() => ({ ...baseParams.value, page: page.value, page_size: 30 }));

// ── Data ──────────────────────────────────────────────────────────────────────
const { data: summary, refresh: refreshSummary } = useAsyncData(
  "compta-summary",
  () => get<ComptaSummary>("/api/comptabilite/summary", { params: { annee: annee.value } }),
  { watch: [annee] },
);

const { data: listData, pending, refresh: refreshList } = useAsyncData(
  "compta-list",
  () => get<Paginated<ComptabiliteEntry>>("/api/comptabilite/", { params: listParams.value }),
  { watch: [listParams] },
);

async function refreshAll() { await Promise.all([refreshSummary(), refreshList()]); }

// ── Formulaire ────────────────────────────────────────────────────────────────
const modalOpen = ref(false);
const editId    = ref<number | null>(null);
const saving    = ref(false);
const formError = ref("");

const empty = () => ({
  date_op: new Date().toISOString().slice(0, 10),
  libelle: "",
  type_operation: "RECETTE" as TypeCompta,
  categorie: "",
  montant_fcfa: null as number | null,
  devise: "XOF",
  taux_change: null as number | null,
  montant_devise: null as number | null,
  reference_doc: "",
  statut_paiement: "EN ATTENTE" as StatutCompta,
  date_echeance: "",
  date_paiement: "",
  service: "",
  notes: "",
  client_id: null as number | null,
  connaissement_id: null as number | null,
});
const form = reactive(empty());

function openCreate() {
  Object.assign(form, empty()); editId.value = null; formError.value = ""; modalOpen.value = true;
}
function openEdit(row: ComptabiliteEntry) {
  Object.assign(form, {
    date_op:         row.date_op,
    libelle:         row.libelle,
    type_operation:  row.type_operation,
    categorie:       row.categorie ?? "",
    montant_fcfa:    row.montant_fcfa,
    devise:          row.devise,
    taux_change:     row.taux_change,
    montant_devise:  row.montant_devise,
    reference_doc:   row.reference_doc ?? "",
    statut_paiement: row.statut_paiement,
    date_echeance:   row.date_echeance ?? "",
    date_paiement:   row.date_paiement ?? "",
    service:         row.service ?? "",
    notes:           row.notes ?? "",
    client_id:       row.client_id,
    connaissement_id: row.connaissement_id,
  });
  editId.value = row.id; formError.value = ""; modalOpen.value = true;
}

async function onSubmit() {
  if (!form.libelle.trim()) { formError.value = "Le libellé est obligatoire."; return; }
  if (!form.montant_fcfa)   { formError.value = "Le montant est obligatoire."; return; }
  saving.value = true; formError.value = "";
  try {
    const body = {
      date_op:          form.date_op,
      libelle:          form.libelle.trim(),
      type_operation:   form.type_operation,
      categorie:        form.categorie  || null,
      montant_fcfa:     form.montant_fcfa,
      devise:           form.devise,
      taux_change:      form.taux_change || null,
      montant_devise:   form.montant_devise || null,
      reference_doc:    form.reference_doc || null,
      statut_paiement:  form.statut_paiement,
      date_echeance:    form.date_echeance  || null,
      date_paiement:    form.date_paiement  || null,
      service:          form.service   || null,
      notes:            form.notes     || null,
      client_id:        form.client_id,
      connaissement_id: form.connaissement_id,
    };
    if (editId.value) await put(`/api/comptabilite/${editId.value}`, body);
    else await post("/api/comptabilite/", body);
    modalOpen.value = false; await refreshAll();
  } catch (e: unknown) {
    formError.value = (e as { data?: { detail?: string } }).data?.detail ?? "Erreur.";
  } finally { saving.value = false; }
}

const deleteTarget = ref<ComptabiliteEntry | null>(null);
async function confirmDelete() {
  if (!deleteTarget.value) return;
  try { await del(`/api/comptabilite/${deleteTarget.value.id}`); deleteTarget.value = null; await refreshAll(); }
  catch { deleteTarget.value = null; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUT_STYLES: Record<string, string> = {
  "PAYÉ":       "background:rgba(99,153,34,0.15);  color:#639922; border:1px solid rgba(99,153,34,0.3);",
  "EN ATTENTE": "background:rgba(239,159,39,0.12); color:#EF9F27; border:1px solid rgba(239,159,39,0.3);",
  "PARTIEL":    "background:rgba(29,158,117,0.12); color:#1D9E75; border:1px solid rgba(29,158,117,0.3);",
  "ANNULÉ":     "background:rgba(120,120,130,0.12); color:#888; border:1px solid rgba(120,120,130,0.3);",
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
      <select v-model="typeOp" class="filter-select">
        <option value="">Recettes + Dépenses</option>
        <option value="RECETTE">Recettes</option>
        <option value="DEPENSE">Dépenses</option>
      </select>
      <select v-model="statut" class="filter-select">
        <option value="">Tous statuts</option>
        <option v-for="s in STATUTS" :key="s" :value="s">{{ s }}</option>
      </select>
      <input v-model="categorie" class="filter-select" style="width:160px;" placeholder="Catégorie…" />
    </div>

    <!-- ── KPIs ───────────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-4 gap-4">
      <div class="kpi-card">
        <div class="kpi-label">Total Recettes</div>
        <div class="kpi-value" style="font-size:15px; color:var(--green);">{{ fmt.fcfa(summary?.total_recettes ?? 0) }}</div>
        <div class="kpi-delta up">↑ {{ summary?.nb_recettes ?? 0 }} opérations</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Dépenses</div>
        <div class="kpi-value" style="font-size:15px; color:var(--danger);">{{ fmt.fcfa(summary?.total_depenses ?? 0) }}</div>
        <div class="kpi-delta down">↓ {{ summary?.nb_depenses ?? 0 }} opérations</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Résultat net {{ annee }}</div>
        <div
          class="kpi-value" style="font-size:15px;"
          :style="(summary?.resultat_net ?? 0) >= 0 ? 'color:var(--green);' : 'color:var(--danger);'"
        >{{ fmt.fcfa(summary?.resultat_net ?? 0) }}</div>
        <div class="kpi-delta neutral">Recettes − Dépenses</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">En attente</div>
        <div class="kpi-value" style="font-size:15px; color:#EF9F27;">{{ fmt.fcfa(summary?.montant_en_attente ?? 0) }}</div>
        <div class="kpi-delta neutral">{{ summary?.nb_en_attente ?? 0 }} opération(s)</div>
      </div>
    </div>

    <!-- ── Tableau ────────────────────────────────────────────────────────── -->
    <div class="app-card flex flex-col gap-4">
      <div class="card-header" style="margin-bottom:0;">
        <div class="card-title">Opérations comptables</div>
        <div class="flex items-center gap-2.5">
          <span class="card-badge">{{ listData?.total ?? 0 }} entrée(s)</span>
          <button class="btn-primary" style="padding:6px 14px;" @click="openCreate">+ Ajouter</button>
        </div>
      </div>

      <div v-if="pending" class="flex items-center justify-center py-16">
        <div class="spinner" />
      </div>
      <div v-else-if="!listData?.items.length" class="text-center py-12" style="color:var(--text3); font-size:13px;">
        Aucune opération comptable.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Libellé</th>
              <th>Type</th>
              <th>Catégorie</th>
              <th>Service</th>
              <th class="text-right">Montant (FCFA)</th>
              <th>Réf. doc.</th>
              <th>Statut paiement</th>
              <th>Échéance</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in listData.items" :key="row.id">
              <td class="font-mono text-xs">{{ row.date_op }}</td>
              <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ row.libelle }}</td>
              <td>
                <span
                  class="badge"
                  :style="row.type_operation === 'RECETTE'
                    ? 'background:rgba(99,153,34,0.15); color:#639922; border:1px solid rgba(99,153,34,0.3);'
                    : 'background:rgba(226,75,74,0.12); color:#E24B4A; border:1px solid rgba(226,75,74,0.3);'"
                  style="font-size:10px;"
                >{{ row.type_operation }}</span>
              </td>
              <td style="font-size:12px; color:var(--text2);">{{ row.categorie ?? '—' }}</td>
              <td style="font-size:12px; color:var(--text2);">{{ row.service ?? '—' }}</td>
              <td
                class="text-right font-mono text-xs font-semibold"
                :style="row.type_operation === 'RECETTE' ? 'color:var(--green);' : 'color:var(--danger);'"
              >
                {{ row.type_operation === 'DEPENSE' ? '− ' : '+ ' }}{{ fmt.fcfa(row.montant_fcfa) }}
              </td>
              <td class="font-mono text-xs">{{ row.reference_doc ?? '—' }}</td>
              <td>
                <span class="badge" :style="STATUT_STYLES[row.statut_paiement] ?? ''" style="font-size:10px;">
                  {{ row.statut_paiement }}
                </span>
              </td>
              <td class="font-mono text-xs">{{ row.date_echeance ?? '—' }}</td>
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
        <span class="text-[12px]" style="color:var(--text3);">Page {{ page }} / {{ listData?.pages }}</span>
        <div class="flex gap-2">
          <button class="btn-ghost" :disabled="page <= 1" @click="page--">← Préc.</button>
          <button class="btn-ghost" :disabled="page >= (listData?.pages ?? 1)" @click="page++">Suiv. →</button>
        </div>
      </div>
    </div>

    <!-- ── Modal ──────────────────────────────────────────────────────────── -->
    <UiModal
      :open="modalOpen"
      :title="editId ? 'Modifier l\'opération' : 'Nouvelle opération comptable'"
      @close="modalOpen = false"
    >
      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group col-span-2">
            <label class="form-label">Libellé <span style="color:var(--danger);">*</span></label>
            <input v-model="form.libelle" class="form-input" placeholder="Description de l'opération" required />
          </div>
          <div class="form-group">
            <label class="form-label">Type <span style="color:var(--danger);">*</span></label>
            <select v-model="form.type_operation" class="form-input">
              <option v-for="t in TYPE_OPS" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Date opération <span style="color:var(--danger);">*</span></label>
            <input v-model="form.date_op" type="date" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">Montant (FCFA) <span style="color:var(--danger);">*</span></label>
            <input v-model.number="form.montant_fcfa" type="number" class="form-input" min="0" required />
          </div>
          <div class="form-group">
            <label class="form-label">Statut paiement</label>
            <select v-model="form.statut_paiement" class="form-input">
              <option v-for="s in STATUTS" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Catégorie</label>
            <input v-model="form.categorie" class="form-input" placeholder="Fret, Salaires, Loyer…" />
          </div>
          <div class="form-group">
            <label class="form-label">Service</label>
            <input v-model="form.service" class="form-input" placeholder="Direction, Opérations…" />
          </div>
          <div class="form-group">
            <label class="form-label">Réf. document</label>
            <input v-model="form.reference_doc" class="form-input" placeholder="FAC-2026-001" />
          </div>
          <div class="form-group">
            <label class="form-label">Devise</label>
            <input v-model="form.devise" class="form-input" placeholder="XOF" />
          </div>
          <div class="form-group">
            <label class="form-label">Date d'échéance</label>
            <input v-model="form.date_echeance" type="date" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Date de paiement</label>
            <input v-model="form.date_paiement" type="date" class="form-input" />
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
      :label="deleteTarget?.libelle ?? 'cette opération'"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />

  </div>
</template>
