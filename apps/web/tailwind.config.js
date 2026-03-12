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
          navy: "#0f172a",
          surface: "#1e293b",
          green: "#ADFF2F"
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

