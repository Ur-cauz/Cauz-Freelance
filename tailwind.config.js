/** @type {import('tailwindcss').Config} */
// Look and feel come from /tokens.css + /panel.css (copied from the control panel). Tailwind is used for layout utilities only,
// and its preflight is off because panel.css has its own reset.
const config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        fg: "var(--text)",
        muted: "var(--text-2)",
        faint: "var(--text-3)",
        line: "var(--line)"
      },
      maxWidth: { page: "72rem" }
    }
  },
  plugins: []
};

export default config;
