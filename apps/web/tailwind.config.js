/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        padel: {
          background: "#0f172a",
          surface: "#1e293b",
          surfaceAlt: "#020617",
          text: "#e5e7eb",
          muted: "#9ca3af",
          primary: "#ADFF2F",
          danger: "#f97373",
          border: "rgba(148, 163, 184, 0.4)"
        }
      },
      fontFamily: {
        display: ["system-ui", "sans-serif"]
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem"
      }
    }
  },
  plugins: []
};

