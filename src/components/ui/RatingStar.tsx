import { useId, type SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * RatingStar — a single star glyph for {@link Rating}. `variant` sets the fill (empty / filled /
 * half). Decorative (`aria-hidden`); the parent Rating carries the accessible value.
 */
export type RatingSize = "small" | "large";
export type RatingStarVariant = "empty" | "filled" | "halfFilled";

const STAR_PATH =
  "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

const SIZE_PX: Record<RatingSize, number> = { small: 16, large: 24 };

export interface RatingStarProps extends SVGProps<SVGSVGElement> {
  size?: RatingSize;
  variant?: RatingStarVariant;
}

export function RatingStar({
  size = "small",
  variant = "empty",
  className,
  ...rest
}: RatingStarProps) {
  const px = SIZE_PX[size];
  // Unique per instance so multiple half-stars on a page don't share one gradient def.
  const gradId = useId();

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      aria-hidden
      className={cn(
        "shrink-0",
        variant === "filled" && "fill-warning",
        variant === "empty" && "fill-border",
        className,
      )}
      {...rest}
    >
      {variant === "halfFilled" ? (
        <>
          <defs>
            {/* Left half filled (warning), right half empty (border). */}
            <linearGradient id={gradId}>
              <stop offset="50%" style={{ stopColor: "hsl(var(--brand-warning))" }} />
              <stop offset="50%" style={{ stopColor: "hsl(var(--border))" }} />
            </linearGradient>
          </defs>
          <path d={STAR_PATH} fill={`url(#${gradId})`} />
        </>
      ) : (
        <path d={STAR_PATH} />
      )}
    </svg>
  );
}
