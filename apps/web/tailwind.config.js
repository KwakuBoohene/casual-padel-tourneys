/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  // Note: Tailwind v4 uses @theme in CSS files (see app/globals.css)
  // This config file is kept for content paths and potential plugins
  plugins: []
};
