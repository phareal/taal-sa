<script setup lang="ts">
const props = defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()

watch(() => props.open, (v) => {
  if (import.meta.client) document.body.style.overflow = v ? 'hidden' : ''
})
onUnmounted(() => { if (import.meta.client) document.body.style.overflow = '' })

function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') emit('close') }
onMounted(() => document.addEventListener('keydown', handleKey))
onUnmounted(() => document.removeEventListener('keydown', handleKey))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-panel">
        <div class="modal-panel-header">
          <span style="font-family:'Syne',sans-serif; font-weight:700; font-size:15px; color:var(--text);">{{ title }}</span>
          <button class="modal-close-btn" @click="$emit('close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-panel-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal-panel-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
}
.modal-panel {
  width: 460px;
  max-width: 100vw;
  min-height: 100vh;
  background: var(--bg2);
  border-left: 1px solid var(--border2);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.22s ease;
}
@keyframes slideIn {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
.modal-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border2);
  flex-shrink: 0;
}
.modal-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--border2);
  background: var(--bg3);
  color: var(--text2);
  cursor: pointer;
  transition: background 0.15s;
}
.modal-close-btn:hover { background: var(--bg4); color: var(--text); }
.modal-panel-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
.modal-panel-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border2);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}
</style>
