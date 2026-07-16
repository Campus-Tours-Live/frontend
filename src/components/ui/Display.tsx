import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { COLOR_CLASS, WEIGHT_CLASS, type TextColor, type TextWeight } from "./typography";

/**
 * Display — the largest text tier, above {@link Heading}: decorative oversized text or a piece of
 * critical data (a hero number, a big stat). Display-font, tight leading. Semantic level is the
 * caller's choice via `as` (default `span`, so it doesn't accidentally claim a heading level).
 * Forwards native attributes to the chosen element.
 *
 *   <Display>Campus Tours</Display>
 *   <Display as="h1" size="lg" weight={700}>1,204</Display>
 */
export type DisplaySize = "sm" | "lg";

const SIZE_CLASS: Record<DisplaySize, string> = {
  sm: "text-[30px]",
  lg: "text-[40px]",
};

export interface DisplayProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span";
  /** @default "lg" */
  size?: DisplaySize;
  /** @default 400 */
  weight?: TextWeight;
  color?: TextColor;
  children: ReactNode;
}

export function Display({
  as: Tag = "span",
  size = "lg",
  weight = 400,
  color = "ink",
  className,
  children,
  ...rest
}: DisplayProps) {
  return (
    <Tag
      className={cn(
        "font-display leading-tight tracking-tight",
        SIZE_CLASS[size],
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
