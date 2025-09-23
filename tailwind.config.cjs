/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				bg: "hsl(var(--bg) / <alpha-value>)",
				surface: "hsl(var(--surface) / <alpha-value>)",
				border: "hsl(var(--border) / <alpha-value>)",
				text: "hsl(var(--text) / <alpha-value>)",
				muted: "hsl(var(--muted) / <alpha-value>)",
				accent: "hsl(var(--accent) / <alpha-value>)",
				"accent-2": "hsl(var(--accent-2) / <alpha-value>)",
				"button-text": "hsl(var(--button-text) / <alpha-value>)",
			}
		}
	},
	plugins: [],
};
  