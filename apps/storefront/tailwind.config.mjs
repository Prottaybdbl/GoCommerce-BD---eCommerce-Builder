/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Hind Siliguri"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      colors: {
        primary: {
          50: "#fff1f2",
          500: "#f43f5e",
          600: "#e11d48",
          700: "#be123c",
        },
      },
    },
  },
  plugins: [],
};
