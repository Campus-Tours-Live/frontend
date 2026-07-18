import { type ElementType, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Glass — a reusable glassmorphism surface: a translucent, blurred panel that reads as frosted glass
 * over imagery or a busy ground. `tone` picks the tint for the ground it sits on:
 *   `light` (default) = brand off-white glass — for dark / photo grounds (e.g. a control over a card image)
 *   `dark`            = translucent card glass — for light grounds
 *
 * Purely presentational. Wrap it around content, or reuse {@link glassClass} on another element that
 * can't be a Glass itself (e.g. IconButton `variant="glass"`). Colours stay on the brand palette
 * (ivory / ink), never pure white. Backdrop blur degrades gracefully where unsupported.
 *
 *   <Glass className="rounded-panel p-4">Frosted panel</Glass>
 *   <IconButton variant="glass" a11yLabel="Save"><Icon name="heart" /></IconButton>
 */
export type GlassTone = "light" | "dark";

export const GLASS_TONE_CLASS: Record<GlassTone, string> = {
  // Brand off-white (#FAF7F0) glass — sits on dark / photo grounds.
  light: "border-ivory/40 bg-ivory/25 text-ivory",
  // Translucent card — sits on light grounds.
  dark: "border-ink/10 bg-card/70 text-ink",
};

/** Shared frosted base: the blur + a hairline border. Pair with a {@link GLASS_TONE_CLASS} tint. */
export const GLASS_BASE = "border backdrop-blur-md";

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
