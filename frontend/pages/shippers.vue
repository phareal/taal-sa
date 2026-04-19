<script setup lang="ts">
import type { Paginated, Shipper, ShipperStatut } from "~/types/api";

const { get, post, put, del } = useApi();
const fmt = useFormat();

const columns = [
  { key: "id",             label: "ID",         class: "w-16 font-mono text-xs" },
  { key: "nom",            label: "Shipper"     },
  { key: "pays",           label: "Pays"        },
  { key: "statut",         label: "Statut"      },
  { key: "ca_actuel_fcfa", label: "CA actuel"   },
  { key: "ca_passe_fcfa",  label: "CA passé"    },
  { key: "nb_bl_actuel",   label: "B/L actuels" },
  { key: "nb_bl_passe",    label: "B/L passés"  },
];

const page = ref(1);
const filters = useFilters({ search: "", statut: "" });
watch(filters, () => { page.value = 1; }, { deep: true });

const queryParams = computed(() => {
  const p: Record<string, string | number> = { page: page.value, page_size: 20 };
  if (filters.search) p.search = filters.search;
  if (filters.statut) p.statut = filters.statut;
  return p;
});

const { data, pending, refresh } = useAsyncData(
  "shippers",
  () => get<Paginated<Shipper>>("/api/shippers/", { params: queryParams.value }),
  { watch: [queryParams] },
);

// ── Formulaire ──────────────────────────────────────────────────────────────
const modalOpen = ref(false);
const editId    = ref<number | null>(null);
const saving    = ref(false);
const errorMsg  = ref("");

const emptyForm = () => ({
  nom: "", pays: "", statut: "ACTIF" as ShipperStatut,
  ca_passe_fcfa: 0, ca_actuel_fcfa: 0,
  nb_bl_passe: 0, nb_bl_actuel: 0,
});
const form = reactive(emptyForm());

function openCreate() {
  Object.assign(form, emptyForm());
  editId.value = null;
  errorMsg.value = "";
  modalOpen.value = true;
}

function openEdit(row: Shipper) {
  Object.assign(form, {
    nom:            row.nom            ?? "",
    pays:           row.pays           ?? "",
    statut:         row.statut,
    ca_passe_fcfa:  row.ca_passe_fcfa  ?? 0,
    ca_actuel_fcfa: row.ca_actuel_fcfa ?? 0,
    nb_bl_passe:    row.nb_bl_passe    ?? 0,
    nb_bl_actuel:   row.nb_bl_actuel   ?? 0,
  });
  editId.value = row.id;
  errorMsg.value = "";
  modalOpen.value = true;
}

async function onSubmit() {
  if (!form.nom.trim()) { errorMsg.value = "Le nom est obligatoire."; return; }
  saving.value = true;
  errorMsg.value = "";
  try {
    const body = {
      nom:            form.nom.trim(),
      pays:           form.pays           || null,
      statut:         form.statut,
      ca_passe_fcfa:  form.ca_passe_fcfa  || 0,
      ca_actuel_fcfa: form.ca_actuel_fcfa || 0,
      nb_bl_passe:    form.nb_bl_passe    || 0,
      nb_bl_actuel:   form.nb_bl_actuel   || 0,
    };
    if (editId.value) {
      await put(`/api/shippers/${editId.value}`, body);
    } else {
      await post("/api/shippers/", body);
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
const deleteTarget = ref<Shipper | null>(null);

async function confirmDelete() {
  if (!deleteTarget.value) return;
  try {
    await del(`/api/shippers/${deleteTarget.value.id}`);
    deleteTarget.value = null;
    await refresh();
  } catch {
    deleteTarget.value = null;
  }
}
</script>

<template>
  <div class="app-card flex flex-col gap-4">
    <div class="card-header" style="margin-bottom: 0;">
      <div class="card-title">Shippers — Expéditeurs</div>
      <div class="flex items-center gap-2.5">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Rechercher…"
          class="filter-select"
          style="width: 200px;"
        />
        <select v-model="filters.statut" class="filter-select">
          <option value="">Tous les statuts</option>
          <option value="ACTIF">Actif</option>
          <option value="EN_DÉCLIN">En déclin</option>
          <option value="PERDU">Perdu</option>
        </select>
        <span class="card-badge">{{ data?.total ?? 0 }} shipper(s)</span>
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
      <template #cell-statut="{ value }">
        <UiStatutBadge :statut="String(value)" />
      </template>
      <template #cell-ca_actuel_fcfa="{ value }">
        <span class="gold-text font-mono">{{ fmt.fcfa(value as number | null) }}</span>
      </template>
      <template #cell-ca_passe_fcfa="{ value }">
        <span style="color:var(--text2);">{{ fmt.fcfa(value as number | null) }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1.5">
          <button class="btn-icon" title="Modifier" @click="openEdit(row as Shipper)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon danger" title="Supprimer" @click="deleteTarget = (row as Shipper)">
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

  <!-- Modal create / edit -->
  <UiModal
    :open="modalOpen"
    :title="editId ? 'Modifier le shipper' : 'Nouveau shipper'"
    @close="modalOpen = false"
  >
    <div class="form-group">
      <label class="form-label">Nom <span style="color:var(--red);">*</span></label>
      <input v-model="form.nom" class="form-input" type="text" placeholder="Raison sociale" />
    </div>
    <div class="form-group">
      <label class="form-label">Pays</label>
      <input v-model="form.pays" class="form-input" type="text" placeholder="Ex : Chine" />
    </div>
    <div class="form-group">
      <label class="form-label">Statut</label>
      <select v-model="form.statut" class="form-input">
        <option value="ACTIF">Actif</option>
        <option value="EN_DÉCLIN">En déclin</option>
        <option value="PERDU">Perdu</option>
      </select>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">CA passé (FCFA)</label>
        <input v-model.number="form.ca_passe_fcfa" class="form-input" type="number" min="0" placeholder="0" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">CA actuel (FCFA)</label>
        <input v-model.number="form.ca_actuel_fcfa" class="form-input" type="number" min="0" placeholder="0" />
      </div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">B/L passés</label>
        <input v-model.number="form.nb_bl_passe" class="form-input" type="number" min="0" placeholder="0" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">B/L actuels</label>
        <input v-model.number="form.nb_bl_actuel" class="form-input" type="number" min="0" placeholder="0" />
      </div>
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
    :label="deleteTarget?.nom"
    @confirm="confirmDelete"
    @cancel="deleteTarget = null"
  />
</template>
