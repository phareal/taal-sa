<script setup lang="ts">
interface NuxtError {
  statusCode?: number;
  statusMessage?: string;
  message?: string;
}
defineProps<{ error: NuxtError }>();
const handleError = () => clearError({ redirect: "/" });
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center p-8"
    style="background: var(--bg);"
  >
    <div class="max-w-md text-center">
      <p
        style="font-family:'DM Mono',monospace; font-size:60px; font-weight:700; color:var(--gold2);"
      >{{ error.statusCode ?? "?" }}</p>
      <h1
        style="font-family:'Syne',sans-serif; font-size:22px; font-weight:700; color:var(--text); margin-top:16px;"
      >{{ error.statusMessage ?? "Erreur" }}</h1>
      <p style="font-size:13px; color:var(--text3); margin-top:8px;">{{ error.message }}</p>
      <button
        class="mt-6 px-5 py-2 rounded-[8px] text-sm font-medium transition-all"
        style="background: var(--goldl); color: var(--gold2); border: 1px solid var(--border);"
        @click="handleError"
      >
        Retour au dashboard
      </button>
    </div>
  </div>
</template>
