import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1180px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
      },
      fontSize: {
        // CampusToursLive type scale (design system)
        // `display` = hero / marketing scale (stays large). `h1` = app page-title scale, tuned
        // smaller than the hero so content pages don't shout on desktop, while staying above `h2`
        // to preserve hierarchy. Both fluid: they scale down for mobile.
        display: [
          "clamp(42px,6vw,76px)",
          { lineHeight: "1.02", letterSpacing: "-0.045em", fontWeight: "700" },
        ],
        h1: [
          "clamp(28px,3.6vw,44px)",
          { lineHeight: "1.08", letterSpacing: "-0.03em", fontWeight: "700" },
        ],
        h2: [
          "clamp(24px,3vw,36px)",
          { lineHeight: "1.12", letterSpacing: "-0.03em", fontWeight: "700" },
        ],
        h3: ["19px", { lineHeight: "1.3", fontWeight: "700" }],
        h4: ["16px", { lineHeight: "1.35", fontWeight: "700" }],
        lead: ["clamp(16px,1vw,18px)", { lineHeight: "1.6", fontWeight: "500" }],
        body: ["15.5px", { lineHeight: "1.55" }],
        // Interface-text sizes (component scale), distinct from the prose `body`/`caption` (which
        // carry line-height). Size only, no line-height, so they drop in for the raw `text-[Npx]`
        // they replace without shifting any vertical rhythm. `ui-lg` (15px) = prominent: Body
        // `large`, Heading `small`, buttons, picker rows. `ui` (14px) = default: Body `medium`,
        // labels, menus, nav. `ui-sm` (13px) = small: Body `small`, field help/error, chips, badges.
        "ui-lg": "15px",
        ui: "14px",
        "ui-sm": "13px",
        caption: ["13px", { lineHeight: "1.4" }],
        eyebrow: ["13px", { lineHeight: "1.2", letterSpacing: "0.08em", fontWeight: "700" }],
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        card: "var(--shadow-card)",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "hsl(var(--brand-primary-dark))",
          soft: "hsl(var(--brand-primary-soft))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        // ---- Extended brand palette (CampusToursLive design system) ----
        sage: {
          DEFAULT: "hsl(var(--brand-sage))",
          deep: "hsl(var(--brand-sage-deep))",
          soft: "hsl(var(--brand-sage-soft))",
          foreground: "hsl(var(--brand-sage-foreground))",
        },
        coral: {
          DEFAULT: "hsl(var(--brand-coral))",
          soft: "hsl(var(--brand-coral-soft))",
          foreground: "hsl(var(--brand-coral-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--brand-success))",
          soft: "hsl(var(--brand-success-soft))",
          foreground: "hsl(var(--brand-success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--brand-warning))",
          soft: "hsl(var(--brand-warning-soft))",
          foreground: "hsl(var(--brand-warning-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--brand-error))",
          soft: "hsl(var(--brand-error-soft))",
          foreground: "hsl(var(--brand-error-foreground))",
        },
        amber: "hsl(var(--brand-amber))",
        purple: {
          DEFAULT: "hsl(var(--brand-purple))",
          soft: "hsl(var(--brand-purple-soft))",
          foreground: "hsl(var(--brand-purple-foreground))",
        },
        // Member role accents (participant=blue, guide=amber, guardian=purple).
        role: {
          participant: {
            DEFAULT: "hsl(var(--role-participant))",
            soft: "hsl(var(--role-participant-soft))",
            foreground: "hsl(var(--role-participant-foreground))",
          },
          guide: {
            DEFAULT: "hsl(var(--role-guide))",
            soft: "hsl(var(--role-guide-soft))",
            foreground: "hsl(var(--role-guide-foreground))",
          },
          guardian: {
            DEFAULT: "hsl(var(--role-guardian))",
            soft: "hsl(var(--role-guardian-soft))",
            foreground: "hsl(var(--role-guardian-foreground))",
          },
        },
        ink: {
          DEFAULT: "hsl(var(--brand-ink))",
          soft: "hsl(var(--brand-ink-soft))",
        },
        ivory: "hsl(var(--brand-ivory))",
        canvas: "hsl(var(--brand-canvas))",
        scrim: "hsl(var(--brand-scrim))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      maxWidth: {
        content: "1180px",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Brand radius scale (design system --r-*). Distinct names avoid clashing
        // with Tailwind's per-corner rounded-{t,r,b,l}-* utilities.
        field: "var(--r-sm)",
        card: "var(--r-md)",
        panel: "var(--r-lg)",
        hero: "var(--r-xl)",
        pill: "var(--r-pill)",
      },
    },
  },
  plugins: [],
} satisfies Config;
