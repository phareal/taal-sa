<script setup lang="ts">
defineProps<{ open: boolean; label?: string }>()
defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="confirm-overlay" @click.self="$emit('cancel')">
      <div class="confirm-box">
        <div style="font-family:'Syne',sans-serif; font-weight:700; font-size:15px; color:var(--text); margin-bottom:8px;">
          Supprimer {{ label ? `« ${label} »` : 'cet élément' }} ?
        </div>
        <p style="font-size:13px; color:var(--text2); margin-bottom:22px; line-height:1.5;">
          Cette action est irréversible. L'enregistrement sera définitivement supprimé.
        </p>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button class="btn-ghost" @click="$emit('cancel')">Annuler</button>
          <button class="btn-danger" @click="$emit('confirm')">Supprimer</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.confirm-box {
  width: 100%;
  max-width: 400px;
  background: var(--bg2);
  border: 1px solid var(--border2);
  border-radius: 14px;
  padding: 24px;
  animation: popIn 0.18s ease;
}
@keyframes popIn {
  from { transform: scale(0.95); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}
.btn-ghost {
  padding: 8px 18px;
  background: var(--bg3);
  border: 1px solid var(--border2);
  color: var(--text2);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-ghost:hover { background: var(--bg4); color: var(--text); }
.btn-danger {
  padding: 8px 18px;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: var(--red);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-danger:hover { background: rgba(248, 113, 113, 0.2); }
</style>
