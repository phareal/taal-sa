import { defineStore } from "pinia";

export const useUiStore = defineStore("ui", () => {
  const sidebarCollapsed = ref(false);
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  };
  return { sidebarCollapsed, toggleSidebar };
});
