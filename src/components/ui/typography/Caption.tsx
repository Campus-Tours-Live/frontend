import { type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { COLOR_CLASS, WEIGHT_CLASS, type TextColor, type TextWeight } from "./typography";

/**
 * Caption — the smallest text tier below {@link Body}: helper text, hints, timestamps, tiny labels.
 * `size` steps below Body: small=12 (default), xs=11, xxs=10. `as` is any element (span default;
 * also p/div/small/dt/dd/legend). weight/colour come from the shared typography tokens.
 *
 *   <Caption>Secondary note</Caption>          // muted by default
 *   <Caption color="error">Required</Caption>
 *   <Caption size="xs" weight={600}>Today</Caption>
 *   <Caption isMonospace>ABC-123</Caption>     // monospace for codes/IDs
 */
export type CaptionSize = "small" | "xs" | "xxs";

const SIZE_CLASS: Record<CaptionSize, string> = {
  small: "text-[12px]",
  xs: "text-[11px]",
  xxs: "text-[10px]",
};

export interface CaptionProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** @default "small" (12px) */
  size?: CaptionSize;
  weight?: TextWeight;
  color?: TextColor;
  /** Render in a monospace font (codes, IDs, digits that must align). */
  isMonospace?: boolean;
  children: ReactNode;
}

export function Caption({
  as: Tag = "span",
  size = "small",
  weight = 400,
  color = "muted",
  isMonospace = false,
  className,
  children,
  ...rest
}: CaptionProps) {
  return (
    <Tag
      className={cn(
        SIZE_CLASS[size],
        isMonospace ? "font-mono" : "font-sans",
        WEIGHT_CLASS[weight],
        COLOR_CLASS[color],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
