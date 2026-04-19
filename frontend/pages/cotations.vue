<script setup lang="ts">
import type { Paginated, Cotation, CotationResultat, StatutPaiement, NatureOperation } from "~/types/api";

const { get, post, put, del } = useApi();
const fmt = useFormat();

const columns = [
  { key: "numero_cotation",   label: "N° Cotation"      },
  { key: "date_cotation",     label: "Date"             },
  { key: "nature_operation",  label: "Nature"           },
  { key: "type_service",      label: "Service"          },
  { key: "offre_transitaire", label: "Offre transit."   },
  { key: "cotation_client",   label: "Cotation client"  },
  { key: "marge",             label: "Marge"            },
  { key: "resultat",          label: "Résultat"         },
  { key: "statut_paiement",   label: "Paiement"         },
  { key: "montant_facture_fcfa", label: "Montant fac."  },
  { key: "agent_commercial",  label: "Agent"            },
];

const page = ref(1);
const filters = useFilters({ search: "", resultat: "", statut_paiement: "" });
watch(filters, () => { page.value = 1; }, { deep: true });

const queryParams = computed(() => {
  const p: Record<string, string | number> = { page: page.value, page_size: 20 };
  if (filters.search)          p.search          = filters.search;
  if (filters.resultat)        p.resultat        = filters.resultat;
  if (filters.statut_paiement) p.statut_paiement = filters.statut_paiement;
  return p;
});

const { data, pending, refresh } = useAsyncData(
  "cotations",
  () => get<Paginated<Cotation>>("/api/cotations/", { params: queryParams.value }),
  { watch: [queryParams] },
);

// ── Formulaire ──────────────────────────────────────────────────────────────
const modalOpen = ref(false);
const editId    = ref<number | null>(null);
const saving    = ref(false);
const errorMsg  = ref("");

const emptyForm = () => ({
  numero_cotation:      "",
  date_cotation:        "",
  client_id:            null as number | null,
  nature_operation:     "" as NatureOperation | "",
  type_service:         "",
  offre_transitaire:    null as number | null,
  cotation_client:      null as number | null,
  marge:                null as number | null,
  devise:               "EUR",
  resultat:             "EN COURS" as CotationResultat,
  statut_paiement:      "EN ATTENTE" as StatutPaiement,
  montant_facture_fcfa: null as number | null,
  date_facture:         "",
  observations:         "",
  agent_commercial:     "",
});
const form = reactive(emptyForm());

function openCreate() {
  Object.assign(form, emptyForm());
  editId.value = null;
  errorMsg.value = "";
  modalOpen.value = true;
}

function openEdit(row: Cotation) {
  Object.assign(form, {
    numero_cotation:      row.numero_cotation      ?? "",
    date_cotation:        row.date_cotation        ?? "",
    client_id:            row.client_id,
    nature_operation:     row.nature_operation     ?? "",
    type_service:         row.type_service         ?? "",
    offre_transitaire:    row.offre_transitaire,
    cotation_client:      row.cotation_client,
    marge:                row.marge,
    devise:               row.devise               ?? "EUR",
    resultat:             row.resultat,
    statut_paiement:      row.statut_paiement      ?? "EN ATTENTE",
    montant_facture_fcfa: row.montant_facture_fcfa,
    date_facture:         row.date_facture          ?? "",
    observations:         row.observations          ?? "",
    agent_commercial:     row.agent_commercial      ?? "",
  });
  editId.value = row.id;
  errorMsg.value = "";
  modalOpen.value = true;
}

async function onSubmit() {
  // numero_cotation auto-généré côté serveur si absent
  saving.value = true;
  errorMsg.value = "";
  try {
    const body = {
      numero_cotation:      form.numero_cotation.trim() || null,
      date_cotation:        form.date_cotation          || null,
      client_id:            form.client_id              || null,
      nature_operation:     form.nature_operation       || null,
      type_service:         form.type_service           || null,
      offre_transitaire:    form.offre_transitaire      ?? null,
      cotation_client:      form.cotation_client        ?? null,
      marge:                form.marge                  ?? null,
      devise:               form.devise                 || "EUR",
      resultat:             form.resultat,
      statut_paiement:      form.statut_paiement,
      montant_facture_fcfa: form.montant_facture_fcfa   ?? null,
      date_facture:         form.date_facture            || null,
      observations:         form.observations            || null,
      agent_commercial:     form.agent_commercial        || null,
    };
    if (editId.value) {
      await put(`/api/cotations/${editId.value}`, body);
    } else {
      await post("/api/cotations/", body);
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
const deleteTarget = ref<Cotation | null>(null);

async function confirmDelete() {
  if (!deleteTarget.value) return;
  try {
    await del(`/api/cotations/${deleteTarget.value.id}`);
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
      <div class="card-title">Cotations Commerciales</div>
      <div class="flex items-center gap-2.5">
        <input
          v-model="filters.search"
          type="text"
          placeholder="N° cotation…"
          class="filter-select"
          style="width: 180px;"
        />
        <select v-model="filters.resultat" class="filter-select">
          <option value="">Tous les résultats</option>
          <option value="GAGNÉ">Gagné</option>
          <option value="PERDU">Perdu</option>
          <option value="EN COURS">En cours</option>
          <option value="ANNULÉ">Annulé</option>
        </select>
        <select v-model="filters.statut_paiement" class="filter-select">
          <option value="">Tous paiements</option>
          <option value="PAYÉ">Payé</option>
          <option value="EN ATTENTE">En attente</option>
          <option value="PARTIEL">Partiel</option>
        </select>
        <span class="card-badge">{{ data?.total ?? 0 }} cotation(s)</span>
        <button class="btn-primary" style="padding: 6px 14px;" @click="openCreate">
          + Nouvelle
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
      <template #cell-numero_cotation="{ value }">
        <span style="font-family:'DM Mono',monospace; font-size:11px; color:var(--gold2);">{{ value }}</span>
      </template>
      <template #cell-nature_operation="{ value }">
        <span v-if="value" class="badge" style="background:rgba(201,151,90,0.1); color:var(--gold2); border:1px solid rgba(201,151,90,0.2); font-size:10px;">{{ value }}</span>
        <span v-else style="color:var(--text3);">—</span>
      </template>
      <template #cell-resultat="{ value }">
        <UiStatutBadge :statut="String(value)" />
      </template>
      <template #cell-statut_paiement="{ value }">
        <span
          class="badge"
          :style="value === 'PAYÉ'
            ? 'background:rgba(99,153,34,0.15); color:#639922; border:1px solid rgba(99,153,34,0.3);'
            : value === 'PARTIEL'
            ? 'background:rgba(29,158,117,0.12); color:#1D9E75; border:1px solid rgba(29,158,117,0.3);'
            : 'background:rgba(239,159,39,0.12); color:#EF9F27; border:1px solid rgba(239,159,39,0.3);'"
          style="font-size:10px;"
        >{{ value }}</span>
      </template>
      <template #cell-montant_facture_fcfa="{ value }">
        <span class="font-mono text-xs">{{ value ? fmt.fcfa(value as number) : '—' }}</span>
      </template>
      <template #cell-offre_transitaire="{ value }">
        {{ fmt.number(value as number | null) }}
      </template>
      <template #cell-cotation_client="{ value }">
        {{ fmt.number(value as number | null) }}
      </template>
      <template #cell-marge="{ value }">
        <span :style="{ color: (value as number) < 0 ? 'var(--red)' : 'var(--green)' }">
          {{ fmt.number(value as number | null) }}
        </span>
      </template>
      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1.5">
          <button class="btn-icon" title="Modifier" @click="openEdit(row as Cotation)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon danger" title="Supprimer" @click="deleteTarget = (row as Cotation)">
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
    :title="editId ? 'Modifier la cotation' : 'Nouvelle cotation'"
    @close="modalOpen = false"
  >
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">N° Cotation <span style="color:var(--red);">*</span></label>
        <input v-model="form.numero_cotation" class="form-input" type="text" placeholder="COT-001" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Date</label>
        <input v-model="form.date_cotation" class="form-input" type="date" />
      </div>
    </div>
    <div class="form-group" style="margin-top:16px;">
      <label class="form-label">Type de service</label>
      <input v-model="form.type_service" class="form-input" type="text" placeholder="Ex : LCL Import" />
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Offre transitaire</label>
        <input v-model.number="form.offre_transitaire" class="form-input" type="number" placeholder="0" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Cotation client</label>
        <input v-model.number="form.cotation_client" class="form-input" type="number" placeholder="0" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Marge</label>
        <input v-model.number="form.marge" class="form-input" type="number" placeholder="0" />
      </div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Devise</label>
        <select v-model="form.devise" class="form-input">
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
          <option value="XOF">XOF</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Résultat</label>
        <select v-model="form.resultat" class="form-input">
          <option value="EN COURS">En cours</option>
          <option value="GAGNÉ">Gagné</option>
          <option value="PERDU">Perdu</option>
          <option value="ANNULÉ">Annulé</option>
        </select>
      </div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Nature opération</label>
        <select v-model="form.nature_operation" class="form-input">
          <option value="">—</option>
          <option value="MARITIME_LCL">Maritime LCL</option>
          <option value="MARITIME_FCL">Maritime FCL</option>
          <option value="AERIEN">Aérien</option>
          <option value="ROUTIER">Routier</option>
          <option value="TRANSIT">Transit</option>
          <option value="ENTREPOSAGE">Entreposage</option>
          <option value="CONSIGNATION">Consignation</option>
          <option value="DIVERS">Divers</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Statut paiement</label>
        <select v-model="form.statut_paiement" class="form-input">
          <option value="EN ATTENTE">En attente</option>
          <option value="PAYÉ">Payé</option>
          <option value="PARTIEL">Partiel</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Montant facturé (FCFA)</label>
        <input v-model.number="form.montant_facture_fcfa" class="form-input" type="number" min="0" placeholder="0" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Date facture</label>
        <input v-model="form.date_facture" class="form-input" type="date" />
      </div>
    </div>
    <div class="form-group" style="margin-top:16px;">
      <label class="form-label">Agent commercial</label>
      <input v-model="form.agent_commercial" class="form-input" type="text" placeholder="Prénom Nom" />
    </div>
    <div class="form-group">
      <label class="form-label">Observations</label>
      <textarea v-model="form.observations" class="form-input" rows="3" placeholder="Notes ou remarques…" style="resize:vertical;" />
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
    :label="deleteTarget?.numero_cotation"
    @confirm="confirmDelete"
    @cancel="deleteTarget = null"
  />
</template>
