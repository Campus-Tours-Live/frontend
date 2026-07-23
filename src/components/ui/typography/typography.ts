/**
 * Shared typography tokens for {@link Heading}, {@link Display}, {@link Body} and {@link Caption} —
 * one place to map the design system's weight/colour choices to Tailwind classes so the text
 * components can't drift.
 */

export type TextWeight = 400 | 500 | 600 | 700 | 800;

/** Semantic text colours (map to the ink/brand tokens). Extend here, not at call sites. */
export type TextColor =
  | "ink"
  | "muted"
  | "primary"
  | "primary-dark"
  | "success"
  | "error"
  | "inverse"
  | "inherit";

export const WEIGHT_CLASS: Record<TextWeight, string> = {
  400: "font-normal",
  500: "font-medium",
  600: "font-semibold",
  700: "font-bold",
  800: "font-extrabold",
};

export const COLOR_CLASS: Record<TextColor, string> = {
  ink: "text-ink",
  muted: "text-ink-soft",
  primary: "text-primary",
  "primary-dark": "text-primary-dark",
  success: "text-success-foreground",
  // The readable dark tone (consistent with `success`) — the light `text-error` is a surface tone
  // for bg-error/border-error, not body text, and fails contrast as text.
  error: "text-error-foreground",
  // Light text for photo / dark grounds — the brand off-white (#FAF7F0), NOT pure white, so it
  // stays on-palette. Pair with a scrim/text-shadow for legibility.
  inverse: "text-ivory",
  // Emit NO colour class, letting a call-site `className` drive the colour — for dynamic/brand
  // tones the semantic set can't name (e.g. a per-university crest colour).
  inherit: "",
};
