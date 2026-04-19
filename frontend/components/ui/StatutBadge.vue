<script setup lang="ts">
const props = defineProps<{ statut: string; label?: string }>();

const tagClass = computed(() => {
  switch (props.statut) {
    case "ACTIF":      return "tag tag-green";
    case "EN_DÉCLIN":  return "tag tag-gold";
    case "PERDU":      return "tag tag-red";
    case "GAGNÉ":      return "tag tag-green";
    case "EN COURS":   return "tag tag-blue";
    case "ANNULÉ":     return "tag tag-gold";
    case "P1":         return "tag tag-red";
    case "P2":         return "tag tag-gold";
    case "P3":         return "tag tag-teal";
    case "IMPORT":     return "tag tag-blue";
    case "EXPORT":     return "tag tag-teal";
    case "À RELANCER": return "tag tag-red";
    case "RELANCÉ":    return "tag tag-green";
    case "EN ATTENTE": return "tag tag-blue";
    default:           return "tag tag-gold";
  }
});
</script>

<template>
  <span :class="tagClass">{{ label ?? statut }}</span>
</template>
