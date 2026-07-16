import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, taught about this app's custom theme scales so it groups them
 * correctly. Without this, a NAMED font-size like `text-h2` (fluid marketing
 * scale) is mistaken for a text-*colour* and gets dropped when it sits next to
 * `text-ink` — e.g. cn("text-h2 text-ink") wrongly → "text-ink". Likewise the
 * brand radii (rounded-card/panel/…) must share one group so a className override
 * (e.g. <Card className="rounded-panel">) wins over the component's rounded-card.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "h1",
            "h2",
            "h3",
            "h4",
            "lead",
            "body",
            "ui-lg",
            "ui",
            "caption",
            "eyebrow",
          ],
        },
      ],
      rounded: [{ rounded: ["field", "card", "panel", "hero", "pill"] }],
    },
  },
});

/**
 * Class-name helper used across the UI library. `clsx` handles conditional
 * inputs (strings, arrays, objects), and `tailwind-merge` resolves conflicting
 * Tailwind utilities so a passed-in `className` reliably overrides a component's
 * defaults — e.g. cn("p-[18px]", "p-0") → "p-0".
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
