<script setup lang="ts">
import type { Paginated, Connaissement, TypeOperation } from '~/types/api'

const { get, post, put, del } = useApi()
const fmt = useFormat()

const MOIS = [
  { num: 1, label: 'Janvier' }, { num: 2, label: 'Février' }, { num: 3, label: 'Mars' },
  { num: 4, label: 'Avril' }, { num: 5, label: 'Mai' }, { num: 6, label: 'Juin' },
  { num: 7, label: 'Juillet' }, { num: 8, label: 'Août' }, { num: 9, label: 'Septembre' },
  { num: 10, label: 'Octobre' }, { num: 11, label: 'Novembre' }, { num: 12, label: 'Décembre' },
]

const columns = [
  { key: 'numero_bl',     label: 'N° B/L'    },
  { key: 'annee',         label: 'Année'     },
  { key: 'mois',          label: 'Mois'      },
  { key: 'type_operation',label: 'Type'      },
  { key: 'quantite',      label: 'Quantité'  },
  { key: 'poids_kg',      label: 'Poids (kg)'},
  { key: 'docs_fees_fcfa',label: 'CA (FCFA)' },
  { key: 'marge_fcfa',    label: 'Marge'     },
  { key: 'taux_marge',    label: 'Tx. marge' },
]

const page = ref(1)
const filters = useFilters({
  search: '',
  annee: undefined as number | undefined,
  mois_num: undefined as number | undefined,
  type_operation: '',
})
watch(filters, () => { page.value = 1 }, { deep: true })

const queryParams = computed(() => {
  const p: Record<string, string | number> = { page: page.value, page_size: 20 }
  if (filters.search)         p.search         = filters.search
  if (filters.annee)          p.annee          = filters.annee
  if (filters.mois_num)       p.mois_num       = filters.mois_num
  if (filters.type_operation) p.type_operation = filters.type_operation
  return p
})

const { data, pending, refresh } = useAsyncData(
  'connaissements',
  () => get<Paginated<Connaissement>>('/api/connaissements/', { params: queryParams.value }),
  { watch: [queryParams] },
)

// ── Formulaire ──────────────────────────────────────────────────────────────
const modalOpen = ref(false)
const editId    = ref<number | null>(null)
const saving    = ref(false)
const errorMsg  = ref('')

const emptyForm = () => ({
  numero_bl:          '',
  annee:              new Date().getFullYear(),
  mois_num:           null as number | null,
  type_operation:     'IMPORT' as TypeOperation,
  navire_id:          null as number | null,
  shipper_id:         null as number | null,
  client_id:          null as number | null,
  quantite:           '',
  poids_kg:           null as number | null,
  volume_m3:          null as number | null,
  docs_fees_fcfa:     null as number | null,
  montant_normal_fcfa:null as number | null,
  marge_fcfa:         null as number | null,
  taux_marge:         null as number | null,
  notes:              '',
})
const form = reactive(emptyForm())

// Auto-calc mois label quand mois_num change
const moisLabel = computed(() =>
  MOIS.find(m => m.num === form.mois_num)?.label ?? null
)

function openCreate() {
  Object.assign(form, emptyForm())
  editId.value = null
  errorMsg.value = ''
  modalOpen.value = true
}

function openEdit(row: Connaissement) {
  Object.assign(form, {
    numero_bl:           row.numero_bl           ?? '',
    annee:               row.annee,
    mois_num:            row.mois_num,
    type_operation:      row.type_operation,
    navire_id:           row.navire_id,
    shipper_id:          row.shipper_id,
    client_id:           row.client_id,
    quantite:            row.quantite            ?? '',
    poids_kg:            row.poids_kg,
    volume_m3:           row.volume_m3,
    docs_fees_fcfa:      row.docs_fees_fcfa,
    montant_normal_fcfa: row.montant_normal_fcfa,
    marge_fcfa:          row.marge_fcfa,
    taux_marge:          row.taux_marge,
    notes:               row.notes               ?? '',
  })
  editId.value = row.id
  errorMsg.value = ''
  modalOpen.value = true
}

async function onSubmit() {
  if (!form.annee) { errorMsg.value = "L'année est obligatoire."; return }
  saving.value = true
  errorMsg.value = ''
  try {
    const body = {
      numero_bl:           form.numero_bl           || null,
      annee:               form.annee,
      mois:                moisLabel.value,
      mois_num:            form.mois_num            ?? null,
      type_operation:      form.type_operation,
      navire_id:           form.navire_id           ?? null,
      shipper_id:          form.shipper_id          ?? null,
      client_id:           form.client_id           ?? null,
      quantite:            form.quantite            || null,
      poids_kg:            form.poids_kg            ?? null,
      volume_m3:           form.volume_m3           ?? null,
      docs_fees_fcfa:      form.docs_fees_fcfa      ?? null,
      montant_normal_fcfa: form.montant_normal_fcfa ?? null,
      marge_fcfa:          form.marge_fcfa          ?? null,
      taux_marge:          form.taux_marge          ?? null,
      notes:               form.notes               || null,
    }
    if (editId.value) {
      await put(`/api/connaissements/${editId.value}`, body)
    } else {
      await post('/api/connaissements/', body)
    }
    modalOpen.value = false
    await refresh()
  } catch (e: unknown) {
    errorMsg.value = (e as { data?: { detail?: string } }).data?.detail ?? "Erreur lors de l'enregistrement."
  } finally {
    saving.value = false
  }
}

// ── Suppression ─────────────────────────────────────────────────────────────
const deleteTarget = ref<Connaissement | null>(null)

async function confirmDelete() {
  if (!deleteTarget.value) return
  try {
    await del(`/api/connaissements/${deleteTarget.value.id}`)
    deleteTarget.value = null
    await refresh()
  } catch {
    deleteTarget.value = null
  }
}
</script>

<template>
  <div class="app-card flex flex-col gap-4">
    <div class="card-header" style="margin-bottom: 0;">
      <div class="card-title">Connaissements</div>
      <div class="flex flex-wrap items-center gap-2.5">
        <input
          v-model="filters.search"
          type="text"
          placeholder="N° B/L…"
          class="filter-select"
          style="width: 160px;"
        />
        <input
          v-model.number="filters.annee"
          type="number"
          placeholder="Année"
          class="filter-select"
          style="width: 90px;"
        />
        <select v-model="filters.mois_num" class="filter-select">
          <option value="">Tous les mois</option>
          <option v-for="m in MOIS" :key="m.num" :value="m.num">{{ m.label }}</option>
        </select>
        <select v-model="filters.type_operation" class="filter-select">
          <option value="">Import & Export</option>
          <option value="IMPORT">Import</option>
          <option value="EXPORT">Export</option>
        </select>
        <span class="card-badge">{{ data?.total ?? 0 }} B/L</span>
        <button class="btn-primary" style="padding: 6px 14px;" @click="openCreate">
          + Nouveau B/L
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
      <template #cell-numero_bl="{ value }">
        <span style="font-family:'DM Mono',monospace; font-size:11px; color:var(--gold2);">{{ value ?? '—' }}</span>
      </template>
      <template #cell-type_operation="{ value }">
        <UiStatutBadge :statut="String(value ?? 'IMPORT')" />
      </template>
      <template #cell-docs_fees_fcfa="{ value }">
        <span class="gold-text">{{ fmt.fcfa(value as number | null) }}</span>
      </template>
      <template #cell-marge_fcfa="{ value }">
        <span :style="{ color: (value as number) < 0 ? 'var(--red)' : 'var(--green)' }">
          {{ fmt.fcfa(value as number | null) }}
        </span>
      </template>
      <template #cell-taux_marge="{ value }">
        <span style="font-family:'DM Mono',monospace;">{{ fmt.percent(value as number | null) }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1.5">
          <button class="btn-icon" title="Modifier" @click="openEdit(row as Connaissement)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon danger" title="Supprimer" @click="deleteTarget = (row as Connaissement)">
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
    :title="editId ? 'Modifier le B/L' : 'Nouveau connaissement'"
    @close="modalOpen = false"
  >
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">N° B/L</label>
        <input v-model="form.numero_bl" class="form-input" type="text" placeholder="TXXX-0000" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Type</label>
        <select v-model="form.type_operation" class="form-input">
          <option value="IMPORT">Import</option>
          <option value="EXPORT">Export</option>
        </select>
      </div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Année <span style="color:var(--red);">*</span></label>
        <input v-model.number="form.annee" class="form-input" type="number" min="2019" max="2030" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Mois</label>
        <select v-model.number="form.mois_num" class="form-input">
          <option :value="null">— Sélectionner —</option>
          <option v-for="m in MOIS" :key="m.num" :value="m.num">{{ m.label }}</option>
        </select>
      </div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-top:16px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Quantité</label>
        <input v-model="form.quantite" class="form-input" type="text" placeholder="Ex : 5 CBM" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Poids (kg)</label>
        <input v-model.number="form.poids_kg" class="form-input" type="number" min="0" step="0.01" placeholder="0" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Volume (m³)</label>
        <input v-model.number="form.volume_m3" class="form-input" type="number" min="0" step="0.01" placeholder="0" />
      </div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">CA / Docs fees (FCFA)</label>
        <input v-model.number="form.docs_fees_fcfa" class="form-input" type="number" min="0" placeholder="0" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Montant normal (FCFA)</label>
        <input v-model.number="form.montant_normal_fcfa" class="form-input" type="number" min="0" placeholder="0" />
      </div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Marge (FCFA)</label>
        <input v-model.number="form.marge_fcfa" class="form-input" type="number" placeholder="0" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Taux de marge</label>
        <input v-model.number="form.taux_marge" class="form-input" type="number" step="0.001" placeholder="0.00" />
      </div>
    </div>
    <div class="form-group" style="margin-top:16px;">
      <label class="form-label">Notes</label>
      <textarea v-model="form.notes" class="form-input" rows="3" placeholder="Remarques éventuelles…" style="resize:vertical;" />
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
    :label="deleteTarget?.numero_bl ?? `B/L #${deleteTarget?.id}`"
    @confirm="confirmDelete"
    @cancel="deleteTarget = null"
  />
</template>
