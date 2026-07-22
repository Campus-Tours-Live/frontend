import { type ElementType, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Glass — a reusable glassmorphism surface modelled on iOS materials: blur + backdrop saturation +
 * a specular top edge + a contact shadow (the recipe lives in `globals.css` under "Glass").
 *
 * `tone` picks the material for the ground it sits on. THEY ARE NOT INTERCHANGEABLE — a tone is a
 * claim about the BACKGROUND, so only the call site can choose it:
 *   `light` = ivory material, ivory glyph — for DARK / photo grounds only.
 *   `dark`  = translucent card, ink glyph — for LIGHT grounds only.
 *   `smoke` = thin ink material, ivory glyph — for ARBITRARY imagery, the only tone that survives
 *             both. Use this for any control over caller-supplied photos.
 *
 * Why `smoke` exists: `light` was once hard-coded into `IconButton`, which put an ivory glyph on
 * ivory glass over a pale campus illustration — roughly 1:1 contrast, so the control was simply
 * absent unless you tabbed to it (WCAG 1.4.11 wants ≥3:1). iOS solves this by sampling backdrop
 * luminance and swapping material; CSS cannot, so pick the tone that needs no sampling.
 *
 * Purely presentational. Wrap it around content, or reuse {@link glassClass} on another element that
 * can't be a Glass itself (e.g. IconButton `variant="glass"`). Colours stay on the brand palette
 * (ivory / ink), never pure white. Degrades where `backdrop-filter` is unsupported, and honours
 * `prefers-reduced-transparency` by going opaque — both handled in `globals.css`.
 *
 *   <Glass className="rounded-panel p-4">Frosted panel</Glass>
 *   <IconButton variant="glass" tone="smoke" a11yLabel="Save"><Icon name="heart" /></IconButton>
 */
export type GlassTone = "light" | "dark" | "smoke";

export const GLASS_TONE_CLASS: Record<GlassTone, string> = {
  light: "glass-light",
  dark: "glass-dark",
  smoke: "glass-smoke",
};

/** Shared material: blur + backdrop saturation. Pair with a {@link GLASS_TONE_CLASS} tone. */
export const GLASS_BASE = "glass";

/** Compose the glass classes for any element (e.g. an IconButton `className`). */
export function glassClass(tone: GlassTone = "light", className?: string): string {
  return cn(GLASS_BASE, GLASS_TONE_CLASS[tone], className);
}

export interface GlassProps extends HTMLAttributes<HTMLElement> {
  /** Element to render. Default `div`. */
  as?: ElementType;
  /** Tint for the ground it sits on. Default `light` (dark / photo grounds). */
  tone?: GlassTone;
}

export function Glass({ as: Tag = "div", tone = "light", className, ...rest }: GlassProps) {
  return <Tag className={glassClass(tone, className)} {...rest} />;
}
