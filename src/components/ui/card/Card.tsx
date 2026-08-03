"use client";

import { type ElementType, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { CardSizeContext, type CardSize } from "./CardSizeContext";

export type { CardSize };

/**
 * Card — surface with the design-system `.card` styling.
 *
 * Use it simply (`padded` adds the standard `.card-pad` inset), or compose the sub-components
 * ({@link CardMedia} / {@link CardHeader} / {@link CardContent} / {@link CardActions}) for a
 * structured card — in that case set `padded={false}` (they pad themselves) and, for a card with
 * media, add `overflow-hidden` so the image respects the rounded corners. `size` sets the padding
 * scale the sub-components read from context.
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Element to render (e.g. `article`/`section` for a semantic card). Default `div`. */
  as?: ElementType;
  /** Standard `.card-pad` inset. Set false when composing the Card* sub-components. Default true. */
  padded?: boolean;
  /** Padding scale for the sub-components (via context). Default "small". */
  size?: CardSize;
}

export function Card({
  as: Tag = "div",
  padded = true,
  size = "small",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <CardSizeContext.Provider value={size}>
      <Tag className={cn("card", padded && "card-pad", className)} {...rest}>
        {children}
      </Tag>
    </CardSizeContext.Provider>
  );
}
