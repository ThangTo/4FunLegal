const colorVar = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2rem",
        "2xl": "2.5rem",
      },
    },
    extend: {
      colors: {
        brand: {
          primary: colorVar("--color-brand-primary"),
          secondary: colorVar("--color-brand-secondary"),
          deep: colorVar("--color-brand-deep"),
        },
        surface: {
          base: colorVar("--color-surface-base"),
          subtle: colorVar("--color-surface-subtle"),
          hero: colorVar("--color-surface-hero"),
          card: colorVar("--color-surface-card"),
          "card-alt": colorVar("--color-surface-card-alt"),
          overlay: colorVar("--color-surface-overlay"),
        },
        text: {
          base: colorVar("--color-text-base"),
          muted: colorVar("--color-text-muted"),
          inverse: colorVar("--color-text-inverse"),
        },
        border: {
          base: colorVar("--color-border-base"),
          strong: colorVar("--color-border-strong"),
        },
        state: {
          success: colorVar("--color-state-success"),
          warning: colorVar("--color-state-warning"),
          error: colorVar("--color-state-error"),
          info: colorVar("--color-state-info"),
        },
        ring: {
          focus: colorVar("--color-ring-focus"),
        },
      },
      backgroundImage: {
        hero:
          "linear-gradient(135deg, rgb(var(--gradient-hero-from)) 0%, rgb(var(--gradient-hero-to)) 100%)",
        cta:
          "linear-gradient(135deg, rgb(var(--gradient-cta-from)) 0%, rgb(var(--gradient-cta-to)) 100%)",
      },
      borderRadius: {
        panel: "1.5rem",
        feature: "2rem",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 16px 48px rgba(18, 59, 93, 0.08)",
        panel: "0 20px 60px rgba(18, 59, 93, 0.12)",
        float: "0 24px 72px rgba(18, 59, 93, 0.18)",
        cta: "0 24px 56px rgba(18, 59, 93, 0.28)",
      },
      fontFamily: {
        sans: ["Be Vietnam Pro", "sans-serif"],
        headline: ["Be Vietnam Pro", "sans-serif"],
        label: ["Be Vietnam Pro", "sans-serif"],
      },
      maxWidth: {
        content: "80rem",
      },
    },
  },
  plugins: [],
};
