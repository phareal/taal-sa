// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },

  ssr: true,
  typescript: {
    strict: true,
    typeCheck: false,
  },

  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt", "@vee-validate/nuxt"],

  css: ["~/assets/css/main.css"],

  app: {
    head: {
      title: "TAAL SA Dashboard",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "description", content: "Dashboard groupage maritime TAAL SA" },
      ],
      link: [
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap",
        },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:8000",
      appName: process.env.NUXT_PUBLIC_APP_NAME || "TAAL SA Dashboard",
    },
  },

  vite: {
    server: {
      hmr: {
        protocol: "ws",
        host: "localhost",
        port: 24678,
      },
    },
  },
});
