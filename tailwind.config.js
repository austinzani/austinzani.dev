// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
    fontFamily: {
      'display': ['"Outfit"', 'sans-serif'],
      'body': ['"Outfit"', 'sans-serif'],
    }
  },
  plugins: [],
}