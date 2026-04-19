<script setup lang="ts">
import type { Paginated, Client } from "~/types/api";

const { get, post, put, del } = useApi();

const columns = [
  { key: "id",        label: "ID",       class: "w-16 font-mono text-xs" },
  { key: "nom",       label: "Client / Consignataire" },
  { key: "secteur",   label: "Secteur"  },
  { key: "pays",      label: "Pays"     },
  { key: "email",     label: "Email"    },
  { key: "telephone", label: "Tél."     },
];

const page = ref(1);
const filters = useFilters({ search: "" });
watch(filters, () => { page.value = 1; }, { deep: true });

const queryParams = computed(() => {
  const p: Record<string, string | number> = { page: page.value, page_size: 20 };
  if (filters.search) p.search = filters.search;
  return p;
});

const { data, pending, refresh } = useAsyncData(
  "clients",
  () => get<Paginated<Client>>("/api/clients/", { params: queryParams.value }),
  { watch: [queryParams] },
);

// ── Formulaire ──────────────────────────────────────────────────────────────
const modalOpen = ref(false);
const editId    = ref<number | null>(null);
const saving    = ref(false);
const errorMsg  = ref("");

const emptyForm = () => ({ nom: "", secteur: "", pays: "", email: "", telephone: "" });
const form = reactive(emptyForm());

function openCreate() {
  Object.assign(form, emptyForm());
  editId.value = null;
  errorMsg.value = "";
  modalOpen.value = true;
}

function openEdit(row: Client) {
  Object.assign(form, {
    nom:       row.nom       ?? "",
    secteur:   row.secteur   ?? "",
    pays:      row.pays      ?? "",
    email:     row.email     ?? "",
    telephone: row.telephone ?? "",
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
      nom:       form.nom.trim(),
      secteur:   form.secteur   || null,
      pays:      form.pays      || null,
      email:     form.email     || null,
      telephone: form.telephone || null,
    };
    if (editId.value) {
      await put(`/api/clients/${editId.value}`, body);
    } else {
      await post("/api/clients/", body);
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
const deleteTarget = ref<Client | null>(null);
const deleting     = ref(false);

async function confirmDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await del(`/api/clients/${deleteTarget.value.id}`);
    deleteTarget.value = null;
    await refresh();
  } catch {
    deleteTarget.value = null;
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div class="app-card flex flex-col gap-4">
    <div class="card-header" style="margin-bottom: 0;">
      <div class="card-title">Clients / Consignataires</div>
      <div class="flex items-center gap-2.5">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Rechercher un client…"
          class="filter-select"
          style="width: 240px;"
        />
        <span class="card-badge">{{ data?.total ?? 0 }} client(s)</span>
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
      <template #cell-nom="{ value }">
        <span style="color: var(--text); font-weight: 500;">{{ value }}</span>
      </template>
      <template #cell-email="{ value }">
        <a
          v-if="value"
          :href="`mailto:${value}`"
          style="color: var(--gold2); font-family:'DM Mono',monospace; font-size:11px; text-decoration:none;"
        >{{ value }}</a>
        <span v-else style="color:var(--text3);">—</span>
      </template>
      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1.5">
          <button class="btn-icon" title="Modifier" @click="openEdit(row as Client)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon danger" title="Supprimer" @click="deleteTarget = (row as Client)">
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
    :title="editId ? 'Modifier le client' : 'Nouveau client'"
    @close="modalOpen = false"
  >
    <div class="form-group">
      <label class="form-label">Nom <span style="color:var(--red);">*</span></label>
      <input v-model="form.nom" class="form-input" type="text" placeholder="Raison sociale ou nom" />
    </div>
    <div class="form-group">
      <label class="form-label">Secteur d'activité</label>
      <input v-model="form.secteur" class="form-input" type="text" placeholder="Ex : Agroalimentaire" />
    </div>
    <div class="form-group">
      <label class="form-label">Pays</label>
      <input v-model="form.pays" class="form-input" type="text" placeholder="Ex : Togo" />
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input v-model="form.email" class="form-input" type="email" placeholder="contact@société.com" />
    </div>
    <div class="form-group">
      <label class="form-label">Téléphone</label>
      <input v-model="form.telephone" class="form-input" type="text" placeholder="+228 …" />
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
