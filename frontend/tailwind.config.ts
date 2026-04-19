import type { Config } from "tailwindcss";

export default <Partial<Config>>{
  content: [
    "./components/**/*.{vue,js,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./composables/**/*.{js,ts}",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    "#0a0b0d",
          surface: "#111318",
          card:    "#181c24",
          inner:   "#1e2330",
        },
        gold: {
          DEFAULT: "#c9975a",
          light:   "#e8b87a",
          lighter: "#f5d49a",
        },
        content: {
          DEFAULT: "#f0ede8",
          muted:   "#9fa3ad",
          subtle:  "#636878",
        },
        primary: {
          DEFAULT: "#0F4C81",
          50:  "#E6EEF6",
          100: "#C2D5E8",
          200: "#8AB0D1",
          300: "#528BBA",
          400: "#2E6DA0",
          500: "#0F4C81",
          600: "#0C3E69",
          700: "#092F50",
          800: "#062038",
          900: "#03101F",
        },
        secondary: { DEFAULT: "#1D9E75" },
        danger:    { DEFAULT: "#E24B4A" },
        warning:   { DEFAULT: "#EF9F27" },
        success:   { DEFAULT: "#639922" },
      },
      fontFamily: {
        sans:    ["DM Sans", "Inter", "system-ui", "sans-serif"],
        display: ["Syne", "DM Sans", "sans-serif"],
        mono:    ["DM Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
