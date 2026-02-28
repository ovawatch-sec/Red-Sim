/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        matrix: "#00ff00",
        neon: "#39ff14",
        void: "#000000",
        deep: "#0a0a0a",
        fail: "#ff4444",
        warn: "#ffaa00",
      },
      boxShadow: {
        neon: "0 0 12px rgba(0,255,0,.35)",
        danger: "0 0 12px rgba(255,68,68,.35)",
      },
      fontFamily: {
        mono: ["Source Code Pro", "Courier New", "monospace"],
        terminal: ["Share Tech Mono", "Courier New", "monospace"],
      },
      keyframes: {
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" }
        },
        glitch: {
          "0%,100%": { transform: "translate(0)" },
          "20%": { transform: "translate(-1px, 1px)" },
          "40%": { transform: "translate(1px, -1px)" },
          "60%": { transform: "translate(-1px, 0)" },
          "80%": { transform: "translate(1px, 0)" }
        }
      },
      animation: {
        blink: "blink 1s step-end infinite",
        glitch: "glitch .25s linear 3",
      }
    },
  },
  plugins: [],
};
