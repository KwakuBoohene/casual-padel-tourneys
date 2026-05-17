/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
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
          border: "rgba(148, 163, 184, 0.4)",
          // Match status colors
          statusLive: "#ADFF2F",
          statusNext: "#fbbf24",
          statusCompleted: "#4ade80",
          statusPending: "#6b7280",
          // Connection status
          connected: "#10b981",
          disconnected: "#ef4444"
        }
      },
      fontFamily: {
        display: ["system-ui", "sans-serif"]
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem"
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "scale-in": "scale-in 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        float: "float 6s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out 3s infinite"
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" }
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "slide-down": {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" }
        }
      }
    }
  },
  plugins: []
};
