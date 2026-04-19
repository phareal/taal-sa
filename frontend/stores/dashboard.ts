import { defineStore } from "pinia";

export const useDashboardStore = defineStore("dashboard", () => {
  const annee = ref<number>(new Date().getFullYear());
  const mois = ref<number | null>(null);

  const setAnnee = (v: number) => (annee.value = v);
  const setMois = (v: number | null) => (mois.value = v);

  return { annee, mois, setAnnee, setMois };
});
