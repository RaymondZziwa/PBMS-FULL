/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  // Light/dark is switched by the "dark" class on <html> (src/theme/ThemeProvider.tsx).
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Prof Bioresearch brand, taken from the logo
        brand: {
          DEFAULT: "#3959A5",
          dark: "#2E4A8C",
          navy: "#1C2C57",
          // Text colours follow the theme (dark text on light, light text on dark).
          ink: token("ink"),
          muted: token("muted"),
          // Brand blue for text and icons: deeper on light, brighter on dark.
          text: token("brand-text"),
        },
        // Theme surfaces (see src/index.css)
        canvas: token("canvas"),
        surface: { DEFAULT: token("surface"), 2: token("surface-2") },
        line: token("line"),
        "ink-soft": token("ink-soft"),
        subtle: token("subtle"),
      },
      fontFamily: {
        inter: ["Inter", "system-ui", "sans-serif"],
        display: ['"Space Grotesk"', "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(16 24 40 / 0.04), 0 1px 3px rgb(16 24 40 / 0.06)",
        pop: "0 16px 40px rgb(16 24 40 / 0.18)",
      },
    },
  },
  plugins: [],
}
