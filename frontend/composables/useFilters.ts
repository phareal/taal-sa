/**
 * Synchronise un objet de filtres avec la querystring de l'URL.
 * Les valeurs falsy (undefined, null, '') sont retirées de l'URL.
 */
export function useFilters<T extends Record<string, string | number | undefined | null>>(
  defaults: T,
) {
  const route = useRoute();
  const router = useRouter();

  const state = reactive<T>({ ...defaults });

  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const val = route.query[key as string];
    if (val !== undefined) {
      // @ts-expect-error keys are constrained by T
      state[key] = val;
    }
  }

  watch(
    state,
    (next) => {
      const query: Record<string, string> = {};
      for (const [k, v] of Object.entries(next)) {
        if (v !== undefined && v !== null && v !== "") {
          query[k] = String(v);
        }
      }
      router.replace({ query });
    },
    { deep: true },
  );

  return state;
}
