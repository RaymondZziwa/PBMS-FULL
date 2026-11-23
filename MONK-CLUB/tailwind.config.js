/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

// Same brand as PBMS (Prof Bioresearch). Light/dark via the "dark" class on <html>.
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#3959A5", dark: "#2E4A8C", navy: "#1C2C57", text: token("brand-text") },
        ink: { DEFAULT: token("ink"), soft: token("ink-soft"), muted: token("muted") },
        canvas: token("canvas"),
        surface: { DEFAULT: token("surface"), 2: token("surface-2") },
        line: token("line"),
        subtle: token("subtle"),
        good: "#16A34A",
        bad: "#DC2626",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Space Grotesk"', "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(16 24 40 / 0.04), 0 1px 3px rgb(16 24 40 / 0.06)",
        pop: "0 16px 40px rgb(16 24 40 / 0.18)",
      },
    },
  },
  plugins: [],
};
