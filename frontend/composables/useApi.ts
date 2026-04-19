import type { ApiError } from "~/types/api";

type FetchOptions = Parameters<typeof $fetch>[1];

export function useApi() {
  const config = useRuntimeConfig();
  const base = config.public.apiBase;

  async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
    try {
      return await $fetch<T>(`${base}${path}`, {
        ...options,
        headers: {
          Accept: "application/json",
          ...(options?.headers ?? {}),
        },
      });
    } catch (err: unknown) {
      const data = (err as { data?: ApiError }).data;
      const detail = data?.detail ?? "Erreur réseau";
      if (import.meta.client) {
        console.error(`[api] ${path} → ${detail}`);
      }
      throw err;
    }
  }

  return {
    get: <T>(path: string, opts?: FetchOptions) =>
      request<T>(path, { ...opts, method: "GET" }),
    post: <T>(path: string, body?: unknown, opts?: FetchOptions) =>
      request<T>(path, { ...opts, method: "POST", body }),
    put: <T>(path: string, body?: unknown, opts?: FetchOptions) =>
      request<T>(path, { ...opts, method: "PUT", body }),
    del: <T>(path: string, opts?: FetchOptions) =>
      request<T>(path, { ...opts, method: "DELETE" }),
  };
}
