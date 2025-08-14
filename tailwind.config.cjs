/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
      extend: {
        colors: {
          bg: "hsl(var(--bg) / <alpha-value>)",
          surface: "hsl(var(--surface) / <alpha-value>)",
          border: "hsl(var(--border) / <alpha-value>)",
          text: "hsl(var(--text) / <alpha-value>)",
          muted: "hsl(var(--muted) / <alpha-value>)",
          accent: "rgba(248, 209, 82, 0.7)",
          "accent-2": "hsl(var(--accent-2) / <alpha-value>)",
        }
      },
    },
    plugins: [],
  };
  