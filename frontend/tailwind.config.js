/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0a1428",
          light: "#101d38",
          lighter: "#182a4a",
        },
        brand: {
          yellow: "#f8d418",
          orange: "#ff6b35",
          cyan: "#00d4ff",
        },
      },
      fontFamily: {
        display: ["Montserrat", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(0, 212, 255, 0.45)",
        "glow-yellow": "0 0 40px -10px rgba(248, 212, 24, 0.45)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,107,53,0.6)" },
          "50%": { boxShadow: "0 0 0 12px rgba(255,107,53,0)" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
