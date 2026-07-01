// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--color-paper)",
        "paper-muted": "var(--color-paper-muted)",
        ink: "var(--color-ink)",
        "ink-muted": "var(--color-ink-muted)",
        line: "var(--color-line)",
        "line-muted": "var(--color-line-muted)",
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        "accent-ink": "var(--color-accent-ink)",
      },
    },
    fontFamily: {
      'display': ['"Outfit"', 'sans-serif'],
      'body': ['"Outfit"', 'sans-serif'],
    }
  },
  plugins: [],
  darkMode: 'class',
}
