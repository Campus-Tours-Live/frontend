import { useId, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "./VisuallyHidden";

/**
 * Spinner — an indeterminate loading indicator: six pills fading in sequence.
 * Fills with `currentColor`, so it inherits its context (white inside a primary
 * button, ink in body text) — no colour prop needed.
 *
 * Decorative by default (`aria-hidden`) since it's usually paired with visible
 * text ("Saving…"). For a standalone spinner, pass `a11yLabel` — it becomes a
 * `role="status"` region that announces the label to assistive tech.
 *
 *   <Button disabled><Spinner /> Saving…</Button>
 *   <Spinner a11yLabel="Loading profile" size={32} />
 */
export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  /** Width/height in px. Default 16. */
  size?: number;
  /** When set, the spinner is announced (role="status") with this label instead of being hidden. */
  a11yLabel?: string;
}

/** One pill, drawn once and reused six times via `<use>`, rotated around the centre. */
const PILL_PATH =
  "M23.7833 1.55122C21.9046 1.55122 20.3818 3.07279 20.3818 4.94971C20.3818 5.77181 21.2057 14.5072 21.496 15.3808C21.8287 16.382 22.7456 17.0508 23.7833 17.0508C24.8209 17.0508 25.7378 16.382 26.0705 15.3808C26.3608 14.5072 27.1847 5.77181 27.1847 4.94971C27.1847 3.07279 25.6618 1.55122 23.7833 1.55122Z";

const PILLS = [0, 1, 2, 3, 4, 5];

export function Spinner({ size = 16, a11yLabel, className, style, ...props }: SpinnerProps) {
  const decorative = a11yLabel === undefined;
  // Unique per instance so multiple spinners on a page don't share one <path> id.
  const pillId = `spinner-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <span
      role={decorative ? undefined : "status"}
      aria-hidden={decorative || undefined}
      className={cn("inline-flex shrink-0", className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="currentColor"
        aria-hidden
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <path id={pillId} d={PILL_PATH} />
        </defs>
        {PILLS.map((i) => (
          <use
            key={i}
            href={`#${pillId}`}
            className="spinner-pill"
            style={{ transform: `rotate(${i * 60}deg)`, animationDelay: `${-(i * 0.2)}s` }}
          />
        ))}
      </svg>
      {decorative ? null : <VisuallyHidden>{a11yLabel}</VisuallyHidden>}
    </span>
  );
}
