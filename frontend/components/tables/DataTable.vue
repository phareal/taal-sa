<script setup lang="ts">
export interface Column {
  key: string;
  label: string;
  class?: string;
}

defineProps<{
  columns: Column[];
  rows: unknown[];
  loading?: boolean;
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}>();

defineEmits<{ "page-change": [page: number] }>();
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Table -->
    <div class="w-full overflow-x-auto rounded-[14px]" style="border: 1px solid var(--border2);">
      <table class="data-table w-full">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="['whitespace-nowrap', col.class ?? '']"
            >
              {{ col.label }}
            </th>
            <th v-if="$slots.actions" style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td
              :colspan="columns.length + ($slots.actions ? 1 : 0)"
              style="text-align: center; padding: 40px; color: var(--text3);"
            >
              <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
                <UiSpinner size="sm" />
                Chargement…
              </div>
            </td>
          </tr>
          <tr v-else-if="!rows.length">
            <td
              :colspan="columns.length + ($slots.actions ? 1 : 0)"
              style="text-align: center; padding: 40px; color: var(--text3);"
            >
              Aucun résultat
            </td>
          </tr>
          <template v-else>
            <tr v-for="(row, i) in rows" :key="i">
              <td v-for="col in columns" :key="col.key" :class="col.class ?? ''">
                <slot
                  :name="`cell-${col.key}`"
                  :row="row"
                  :value="(row as Record<string, unknown>)[col.key]"
                >
                  {{ (row as Record<string, unknown>)[col.key] ?? "—" }}
                </slot>
              </td>
              <td v-if="$slots.actions" style="text-align: right;">
                <slot name="actions" :row="row" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div
      v-if="total > 0"
      class="flex items-center justify-between text-xs"
      style="color: var(--text3);"
    >
      <span>
        {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, total) }}
        sur {{ total }}
      </span>
      <div class="flex items-center gap-1">
        <button
          :disabled="page <= 1"
          class="px-2 py-1 rounded disabled:opacity-30 transition-colors"
          style="border: 1px solid var(--border2); color: var(--text2); background: var(--bg3);"
          @click="$emit('page-change', page - 1)"
        >
          ‹
        </button>
        <span class="px-3 py-1" style="color: var(--text2);">{{ page }} / {{ pages }}</span>
        <button
          :disabled="page >= pages"
          class="px-2 py-1 rounded disabled:opacity-30 transition-colors"
          style="border: 1px solid var(--border2); color: var(--text2); background: var(--bg3);"
          @click="$emit('page-change', page + 1)"
        >
          ›
        </button>
      </div>
    </div>
  </div>
</template>
