/**
 * Shared typography tokens for {@link Heading}, {@link Display}, {@link Body} and {@link Caption} —
 * one place to map the design system's weight/colour choices to Tailwind classes so the text
 * components can't drift.
 */

export type TextWeight = 400 | 600 | 700;

/** Semantic text colours (map to the ink/brand tokens). Extend here, not at call sites. */
export type TextColor = "ink" | "muted" | "primary" | "primary-dark" | "success" | "error";

export const WEIGHT_CLASS: Record<TextWeight, string> = {
  400: "font-normal",
  600: "font-semibold",
  700: "font-bold",
};

export const COLOR_CLASS: Record<TextColor, string> = {
  ink: "text-ink",
  muted: "text-ink-soft",
  primary: "text-primary",
  "primary-dark": "text-primary-dark",
  success: "text-success-foreground",
  error: "text-error",
};
