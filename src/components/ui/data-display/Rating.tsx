import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { RatingStar, type RatingSize } from "./RatingStar";

export type { RatingSize };

/**
 * Rating — a read-only 5-star score. `value` (0–5, halves allowed) fills the stars; a star is filled
 * from `count - 0.25`, half-filled from `count - 0.75`. Exposes the value as the accessible name.
 *
 *   <Rating value={3.5} />
 *   <Rating value={4} size="large" />
 */
export interface RatingProps extends HTMLAttributes<HTMLDivElement> {
  /** 0–5 (halves allowed). Default 0. */
  value?: number;
  size?: RatingSize;
}

export function Rating({ value = 0, size = "small", className, ...rest }: RatingProps) {
  return (
    <div
      role="img"
      aria-label={`${value} out of 5 stars`}
      className={cn("inline-flex items-center gap-0.5", className)}
      {...rest}
    >
      {[1, 2, 3, 4, 5].map((count) => {
        const variant =
          value >= count - 0.25 ? "filled" : value >= count - 0.75 ? "halfFilled" : "empty";
        return <RatingStar key={count} size={size} variant={variant} />;
      })}
    </div>
  );
}
