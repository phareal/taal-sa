<script setup lang="ts">
import type { Paginated, Prospect, Priorite } from "~/types/api";

const { get, post, put, del } = useApi();
const fmt = useFormat();

const columns = [
  { key: "client_id",        label: "Client ID",      class: "w-24 font-mono text-xs" },
  { key: "type_statut",      label: "Type"            },
  { key: "priorite",         label: "Priorité"        },
  { key: "ca_pic_fcfa",      label: "CA pic"          },
  { key: "ca_derniere_fcfa", label: "Dernier CA"      },
  { key: "annee_derniere_op",label: "Dernière opér."  },
  { key: "action_prevue",    label: "Action prévue"   },
  { key: "date_relance",     label: "Date relance"    },
  { key: "statut_relance",   label: "Statut relance"  },
];

const today = new Date().toISOString().slice(0, 10);
function isOverdue(date: string | null): boolean {
  return !!date && date < today;
}

const page = ref(1);
const filters = useFilters({ priorite: "", statut_relance: "" });
watch(filters, () => { page.value = 1; }, { deep: true });

const queryParams = computed(() => {
  const p: Record<string, string | number> = { page: page.value, page_size: 20 };
  if (filters.priorite)      p.priorite      = filters.priorite;
  if (filters.statut_relance) p.statut_relance = filters.statut_relance;
  return p;
});

const { data, pending, refresh } = useAsyncData(
  "prospects",
  () => get<Paginated<Prospect>>("/api/prospects/", { params: queryParams.value }),
  { watch: [queryParams] },
);

// ── Formulaire ──────────────────────────────────────────────────────────────
const modalOpen = ref(false);
const editId    = ref<number | null>(null);
const saving    = ref(false);
const errorMsg  = ref("");

const emptyForm = () => ({
  client_id:          null as number | null,
  type_statut:        "",
  priorite:           "P3" as Priorite,
  ca_pic_fcfa:        0,
  ca_derniere_fcfa:   0,
  annee_derniere_op:  null as number | null,
  action_prevue:      "",
  date_relance:       "",
  statut_relance:     "À CONTACTER",
  notes:              "",
});
const form = reactive(emptyForm());

function openCreate() {
  Object.assign(form, emptyForm());
  editId.value = null;
  errorMsg.value = "";
  modalOpen.value = true;
}

function openEdit(row: Prospect) {
  Object.assign(form, {
    client_id:         row.client_id,
    type_statut:       row.type_statut        ?? "",
    priorite:          row.priorite,
    ca_pic_fcfa:       row.ca_pic_fcfa        ?? 0,
    ca_derniere_fcfa:  row.ca_derniere_fcfa   ?? 0,
    annee_derniere_op: row.annee_derniere_op,
    action_prevue:     row.action_prevue      ?? "",
    date_relance:      row.date_relance       ?? "",
    statut_relance:    row.statut_relance     ?? "À CONTACTER",
    notes:             row.notes             ?? "",
  });
  editId.value = row.id;
  errorMsg.value = "";
  modalOpen.value = true;
}

async function onSubmit() {
  if (!form.client_id) { errorMsg.value = "L'ID client est obligatoire."; return; }
  saving.value = true;
  errorMsg.value = "";
  try {
    const body = {
      client_id:         form.client_id,
      type_statut:       form.type_statut       || null,
      priorite:          form.priorite,
      ca_pic_fcfa:       form.ca_pic_fcfa       || 0,
      ca_derniere_fcfa:  form.ca_derniere_fcfa  || 0,
      annee_derniere_op: form.annee_derniere_op ?? null,
      action_prevue:     form.action_prevue     || null,
      date_relance:      form.date_relance      || null,
      statut_relance:    form.statut_relance    || null,
      notes:             form.notes             || null,
    };
    if (editId.value) {
      await put(`/api/prospects/${editId.value}`, body);
    } else {
      await post("/api/prospects/", body);
    }
    modalOpen.value = false;
    await refresh();
  } catch (e: unknown) {
    errorMsg.value = (e as { data?: { detail?: string } }).data?.detail ?? "Erreur lors de l'enregistrement.";
  } finally {
    saving.value = false;
  }
}

// ── Suppression ─────────────────────────────────────────────────────────────
const deleteTarget = ref<Prospect | null>(null);

async function confirmDelete() {
  if (!deleteTarget.value) return;
  try {
    await del(`/api/prospects/${deleteTarget.value.id}`);
    deleteTarget.value = null;
    await refresh();
  } catch {
    deleteTarget.value = null;
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- KPIs -->
    <div class="grid grid-cols-3 gap-4 mb-1">
      <div class="kpi-card">
        <div class="kpi-label">Shippers à relancer</div>
        <div class="kpi-value">15 <span class="kpi-sub">cibles</span></div>
        <div class="kpi-delta down">↓ Churn détecté</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">CA potentiel récupérable</div>
        <div class="kpi-value">~50M <span class="kpi-sub">FCFA</span></div>
        <div class="kpi-delta up">↑ Opportunité forte</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Taux de fidélité</div>
        <div class="kpi-value">~18%</div>
        <div class="kpi-delta down">↓ À améliorer</div>
      </div>
    </div>

    <div class="app-card flex flex-col gap-4">
      <div class="card-header" style="margin-bottom: 0;">
        <div class="card-title">Liste des prospects</div>
        <div class="flex items-center gap-2.5">
          <select v-model="filters.priorite" class="filter-select">
            <option value="">Toutes priorités</option>
            <option value="P1">P1 — Haute</option>
            <option value="P2">P2 — Moyenne</option>
            <option value="P3">P3 — Basse</option>
          </select>
          <select v-model="filters.statut_relance" class="filter-select">
            <option value="">Tous statuts relance</option>
            <option value="À RELANCER">À relancer</option>
            <option value="RELANCÉ">Relancé</option>
            <option value="EN ATTENTE">En attente</option>
          </select>
          <span class="card-badge">{{ data?.total ?? 0 }} prospect(s)</span>
          <button class="btn-primary" style="padding: 6px 14px;" @click="openCreate">
            + Nouveau
          </button>
        </div>
      </div>

      <TablesDataTable
        :columns="columns"
        :rows="data?.items ?? []"
        :loading="pending"
        :total="data?.total ?? 0"
        :page="page"
        :page-size="20"
        :pages="data?.pages ?? 0"
        @page-change="page = $event"
      >
        <template #cell-priorite="{ value }">
          <UiStatutBadge :statut="String(value)" />
        </template>
        <template #cell-ca_pic_fcfa="{ value }">
          <span class="gold-text">{{ fmt.fcfa(value as number | null) }}</span>
        </template>
        <template #cell-ca_derniere_fcfa="{ value }">
          {{ fmt.fcfa(value as number | null) }}
        </template>
        <template #cell-date_relance="{ value }">
          <span :style="{ color: isOverdue(value as string | null) ? 'var(--red)' : 'inherit', fontWeight: isOverdue(value as string | null) ? '600' : 'normal' }">
            {{ value ?? '—' }}
          </span>
        </template>
        <template #cell-statut_relance="{ value }">
          <UiStatutBadge v-if="value" :statut="String(value)" />
          <span v-else style="color:var(--text3);">—</span>
        </template>
        <template #actions="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <button class="btn-icon" title="Modifier" @click="openEdit(row as Prospect)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon danger" title="Supprimer" @click="deleteTarget = (row as Prospect)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
          </div>
        </template>
      </TablesDataTable>
    </div>
  </div>

  <!-- Modal create / edit -->
  <UiModal
    :open="modalOpen"
    :title="editId ? 'Modifier le prospect' : 'Nouveau prospect'"
    @close="modalOpen = false"
  >
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">ID Client <span style="color:var(--red);">*</span></label>
        <input v-model.number="form.client_id" class="form-input" type="number" min="1" placeholder="Ex : 42" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Priorité</label>
        <select v-model="form.priorite" class="form-input">
          <option value="P1">P1 — Haute</option>
          <option value="P2">P2 — Moyenne</option>
          <option value="P3">P3 — Basse</option>
        </select>
      </div>
    </div>
    <div class="form-group" style="margin-top:16px;">
      <label class="form-label">Type / statut</label>
      <input v-model="form.type_statut" class="form-input" type="text" placeholder="Ex : Ancien client actif" />
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">CA pic (FCFA)</label>
        <input v-model.number="form.ca_pic_fcfa" class="form-input" type="number" min="0" placeholder="0" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Dernier CA (FCFA)</label>
        <input v-model.number="form.ca_derniere_fcfa" class="form-input" type="number" min="0" placeholder="0" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Année dernière op.</label>
        <input v-model.number="form.annee_derniere_op" class="form-input" type="number" min="2000" max="2030" placeholder="2024" />
      </div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Date de relance</label>
        <input v-model="form.date_relance" class="form-input" type="date" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Statut relance</label>
        <select v-model="form.statut_relance" class="form-input">
          <option value="À CONTACTER">À contacter</option>
          <option value="À RELANCER">À relancer</option>
          <option value="RELANCÉ">Relancé</option>
          <option value="EN ATTENTE">En attente</option>
        </select>
      </div>
    </div>
    <div class="form-group" style="margin-top:16px;">
      <label class="form-label">Action prévue</label>
      <textarea v-model="form.action_prevue" class="form-input" rows="2" placeholder="Ex : Appel téléphonique + envoi offre" style="resize:vertical;" />
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea v-model="form.notes" class="form-input" rows="2" placeholder="Informations complémentaires…" style="resize:vertical;" />
    </div>
    <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>

    <template #footer>
      <button class="btn-ghost" @click="modalOpen = false">Annuler</button>
      <button class="btn-primary" :disabled="saving" @click="onSubmit">
        {{ saving ? 'Enregistrement…' : (editId ? 'Mettre à jour' : 'Créer') }}
      </button>
    </template>
  </UiModal>

  <!-- Confirmation suppression -->
  <UiConfirmDelete
    :open="!!deleteTarget"
    :label="`prospect #${deleteTarget?.id}`"
    @confirm="confirmDelete"
    @cancel="deleteTarget = null"
  />
</template>
