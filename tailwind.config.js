/** @type {import('tailwindcss').Config} */
// Colours come from /tokens.css (shared with /lab). They are plain hex variables, so Tailwind
// opacity modifiers (bg-x/50) are not available on these names; use the panel tokens instead.
const config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        "panel-3": "var(--panel-3)",
        inset: "var(--inset)",
        fg: "var(--text)",
        muted: "var(--text-2)",
        faint: "var(--text-3)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent)",
        primary: "var(--primary-bg)",
        run: "var(--run)",
        danger: "var(--crit)"
      },
      fontFamily: {
        sans: ["var(--font)"],
        mono: ["var(--mono)"]
      },
      maxWidth: {
        page: "70rem"
      }
    }
  },
  plugins: []
};

export default config;
