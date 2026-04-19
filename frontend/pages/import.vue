<template>
  <div class="flex flex-col gap-6">
    <!-- Upload zone -->
    <div
      class="app-card flex flex-col items-center justify-center gap-4 text-center"
      style="min-height: 220px; border-style: dashed; cursor: pointer; position:relative;"
      :style="dragging ? 'border-color:var(--gold); background:var(--goldl2);' : ''"
      @click="triggerFile"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none;" @change="onFileChange" />

      <div style="width:48px; height:48px; background:var(--goldl); border-radius:12px; display:flex; align-items:center; justify-content:center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9975a" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <div>
        <div style="font-family:'Syne',sans-serif; font-size:15px; font-weight:600; color:var(--text);">
          {{ selectedFile ? selectedFile.name : 'Déposer un fichier Excel' }}
        </div>
        <div style="font-size:12px; color:var(--text3); margin-top:4px;">
          .xlsx · .xls · Upsert sur N° B/L — max 50 MB
        </div>
      </div>

      <button
        v-if="selectedFile"
        :disabled="loading"
        style="padding:8px 24px; border-radius:8px; background:var(--gold); color:#0a0b0d; font-weight:600; font-size:13px; border:none; cursor:pointer; margin-top:4px;"
        @click.stop="uploadFile"
      >
        {{ loading ? 'Importation…' : 'Importer' }}
      </button>
    </div>

    <!-- Progress / error message -->
    <div v-if="errorMsg" class="app-card" style="border-color: var(--red);">
      <div style="color:var(--red); font-size:13px; font-weight:600;">{{ errorMsg }}</div>
    </div>

    <!-- Result -->
    <div v-if="result" class="app-card">
      <div class="card-header">
        <div class="card-title">Résultat de l'import</div>
        <span class="card-badge" :style="result.errors.length ? 'background:rgba(226,75,74,.15);color:var(--red);' : 'background:rgba(99,153,34,.15);color:var(--green);'">
          {{ result.errors.length ? `${result.errors.length} erreur(s)` : 'Succès' }}
        </span>
      </div>

      <!-- Stats -->
      <div class="stat-strip" style="margin-bottom:16px;">
        <div class="strip-item">
          <div class="strip-val" style="color:var(--green);">{{ result.inserted }}</div>
          <div class="strip-label">Insérés</div>
        </div>
        <div class="strip-item">
          <div class="strip-val" style="color:var(--gold);">{{ result.updated }}</div>
          <div class="strip-label">Mis à jour</div>
        </div>
        <div class="strip-item">
          <div class="strip-val" :style="result.errors.length ? 'color:var(--red)' : 'color:var(--text3)'">{{ result.errors.length }}</div>
          <div class="strip-label">Erreurs</div>
        </div>
        <div class="strip-item">
          <div class="strip-val">{{ result.inserted + result.updated }}</div>
          <div class="strip-label">Total traités</div>
        </div>
      </div>

      <!-- Error table -->
      <div v-if="result.errors.length" style="overflow-x:auto;">
        <table class="data-table w-full">
          <thead>
            <tr>
              <th>Ligne</th>
              <th>N° B/L</th>
              <th>Raison</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in result.errors" :key="e.row">
              <td style="font-family:'DM Mono',monospace;">{{ e.row }}</td>
              <td style="font-family:'DM Mono',monospace; color:var(--text3);">{{ e.numero_bl ?? '—' }}</td>
              <td style="color:var(--red); font-size:12px;">{{ e.reason }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Export section -->
    <div class="app-card">
      <div class="card-header">
        <div class="card-title">Export Excel</div>
        <span class="card-badge">Filtres optionnels</span>
      </div>
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <label style="font-size:11px; color:var(--text3);">Année</label>
          <select v-model="exportAnnee" class="filter-select" style="width:120px;">
            <option :value="null">Toutes</option>
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px;">
          <label style="font-size:11px; color:var(--text3);">Mois</label>
          <select v-model="exportMois" class="filter-select" style="width:140px;">
            <option :value="null">Tous</option>
            <option v-for="m in MOIS" :key="m.v" :value="m.v">{{ m.l }}</option>
          </select>
        </div>
        <button
          style="padding:8px 20px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:var(--text); font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px;"
          @click="downloadExport"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Télécharger .xlsx
        </button>
      </div>
    </div>

    <!-- Format info -->
    <div class="app-card">
      <div class="card-header">
        <div class="card-title">Format attendu</div>
        <span class="card-badge">Mapping colonnes</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div>
          <div class="metric-row"><span class="metric-name">Feuille détectée</span><span class="metric-val">Auto (par nom)</span></div>
          <div class="metric-row"><span class="metric-name">Clé upsert</span><span class="metric-val" style="font-family:'DM Mono',monospace;">numero_bl</span></div>
          <div class="metric-row"><span class="metric-name">Casse colonnes</span><span class="metric-val">Tolérant (trim + uppercase)</span></div>
        </div>
        <div>
          <div class="metric-row"><span class="metric-name">Conflits</span><span class="metric-val">UPDATE automatique</span></div>
          <div class="metric-row"><span class="metric-name">Nouveaux</span><span class="metric-val">INSERT</span></div>
          <div class="metric-row"><span class="metric-name">Retour</span><span class="metric-val" style="font-family:'DM Mono',monospace;">{ inserted, updated, errors }</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const API = config.public.apiBase

interface RowErrorOut { row: number; numero_bl: string | null; reason: string }
interface ImportResultOut { inserted: number; updated: number; errors: RowErrorOut[] }

const MOIS = [
  { v: 1, l: 'Janvier' }, { v: 2, l: 'Février' }, { v: 3, l: 'Mars' },
  { v: 4, l: 'Avril' }, { v: 5, l: 'Mai' }, { v: 6, l: 'Juin' },
  { v: 7, l: 'Juillet' }, { v: 8, l: 'Août' }, { v: 9, l: 'Septembre' },
  { v: 10, l: 'Octobre' }, { v: 11, l: 'Novembre' }, { v: 12, l: 'Décembre' },
]

const currentYear = new Date().getFullYear()
const years = Array.from({ length: currentYear - 2018 }, (_, i) => 2019 + i)

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const dragging = ref(false)
const loading = ref(false)
const errorMsg = ref<string | null>(null)
const result = ref<ImportResultOut | null>(null)

const exportAnnee = ref<number | null>(null)
const exportMois = ref<number | null>(null)

function triggerFile() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) {
    selectedFile.value = input.files[0]
    result.value = null
    errorMsg.value = null
  }
}

function onDrop(e: DragEvent) {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) {
    selectedFile.value = f
    result.value = null
    errorMsg.value = null
  }
}

async function uploadFile() {
  if (!selectedFile.value) return
  loading.value = true
  errorMsg.value = null
  result.value = null

  try {
    const form = new FormData()
    form.append('file', selectedFile.value)

    const res = await fetch(`${API}/api/import/excel`, {
      method: 'POST',
      body: form,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: 'Erreur serveur' }))
      errorMsg.value = body.detail ?? `Erreur ${res.status}`
      return
    }

    result.value = await res.json() as ImportResultOut
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
  } catch (e) {
    errorMsg.value = 'Impossible de joindre le serveur'
  } finally {
    loading.value = false
  }
}

function downloadExport() {
  const params = new URLSearchParams()
  if (exportAnnee.value) params.set('annee', String(exportAnnee.value))
  if (exportMois.value) params.set('mois_num', String(exportMois.value))
  const url = `${API}/api/export/excel?${params.toString()}`
  window.open(url, '_blank')
}
</script>

<style scoped>
.metric-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.metric-name { color: var(--text3); }
.metric-val  { color: var(--text);  font-weight: 500; }
</style>
