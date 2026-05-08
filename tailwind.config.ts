import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm neutral ramp. The product is text-first, so the page reads as paper.
        ink: {
          50: "#fbfaf6",
          75: "#f6f4ee",
          100: "#f1efe7",
          200: "#e3e0d4",
          300: "#cdc8b8",
          400: "#a39d8a",
          500: "#777163",
          600: "#524d44",
          700: "#373430",
          800: "#22201d",
          900: "#141311",
        },
        // Single editorial accent. Used sparingly: links on hover, eyebrow rules,
        // active tab indicator, ready-state dot, citation chip on hover.
        accent: {
          50: "#fbf3ec",
          100: "#f4e1d2",
          200: "#e8c2a4",
          300: "#d99a6e",
          400: "#c87a48",
          500: "#b45e2c",
          600: "#9a4c1f",
          700: "#7d3d1a",
          800: "#5e2e15",
          900: "#3f1f0e",
          DEFAULT: "#b45e2c",
        },
        // Considered status tones, not raw Tailwind defaults.
        positive: {
          100: "#e6efe4",
          500: "#5b8a64",
          700: "#3f6347",
        },
        warn: {
          100: "#f4ebd6",
          500: "#b08628",
          700: "#7a5d1c",
        },
        critical: {
          100: "#f3dfdb",
          500: "#a8463a",
          700: "#7a2f26",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Inter",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        serif: [
          "Iowan Old Style",
          "Charter",
          "Source Serif Pro",
          "Georgia",
          "Cambria",
          "serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        // Tighter custom sizes for editorial rhythm.
        eyebrow: ["11px", { lineHeight: "1.2", letterSpacing: "0.16em" }],
        meta: ["12px", { lineHeight: "1.4" }],
        body: ["15px", { lineHeight: "1.65" }],
      },
      letterSpacing: {
        tightish: "-0.012em",
        tighter2: "-0.02em",
      },
      maxWidth: {
        prose: "62ch",
        readable: "70ch",
      },
      boxShadow: {
        // Tuned shadows. Slightly warm, very low.
        soft: "0 1px 0 rgba(20,18,15,0.03), 0 1px 12px rgba(20,18,15,0.04)",
        lift: "0 1px 0 rgba(20,18,15,0.04), 0 6px 24px rgba(20,18,15,0.06)",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
