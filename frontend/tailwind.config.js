/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,html}",
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
        primary: { DEFAULT: "#0F4C81" },
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
