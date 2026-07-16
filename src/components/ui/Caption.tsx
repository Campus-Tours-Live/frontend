import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { COLOR_CLASS, WEIGHT_CLASS, type TextColor, type TextWeight } from "./typography";

/**
 * Caption — the smallest text tier below {@link Body}: helper text, hints, timestamps, the "*
 * required" note. Fixed caption size; weight/colour come from the shared typography tokens.
 *
 *   <Caption>Secondary note</Caption>          // muted by default
 *   <Caption color="error">Required</Caption>
 *   <Caption weight={700}>Bold</Caption>
 *   <Caption isMonospace>ABC-123</Caption>     // monospace for codes/IDs
 *   <Caption as="p">…</Caption>                // span default; also p / div / small
 */
export interface CaptionProps {
  as?: "span" | "p" | "div" | "small";
  weight?: TextWeight;
  color?: TextColor;
  /** Render in a monospace font (codes, IDs, digits that must align). */
  isMonospace?: boolean;
  className?: string;
  children: ReactNode;
}

export function Caption({
  as: Tag = "span",
  weight = 400,
  color = "muted",
  isMonospace = false,
  className,
  children,
}: CaptionProps) {
  return (
    <Tag
      className={cn(
        "text-[12px]",
        isMonospace ? "font-mono" : "font-sans",
        WEIGHT_CLASS[weight],
        COLOR_CLASS[color],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
