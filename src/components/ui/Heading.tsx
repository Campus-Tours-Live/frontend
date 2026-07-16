import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { COLOR_CLASS, WEIGHT_CLASS, type TextColor, type TextWeight } from "./typography";

/**
 * Heading — display-font titles (h1–h4). Decouples the semantic level (`as`) from the visual
 * `size`, and pulls weight/colour from the shared typography tokens, so headings stay consistent
 * instead of each call site hand-writing `font-display text-[20px] font-bold text-ink`.
 */
export type HeadingSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<HeadingSize, string> = {
  sm: "text-[15px]",
  md: "text-[17px]",
  lg: "text-[20px]",
  xl: "text-[24px]",
};

export interface HeadingProps {
  /** Semantic tag — pick by document outline, independent of `size`. Default `h2`. */
  as?: "h1" | "h2" | "h3" | "h4";
  size?: HeadingSize;
  weight?: TextWeight;
  color?: TextColor;
  id?: string;
  className?: string;
  children: ReactNode;
}

export function Heading({
  as: Tag = "h2",
  size = "lg",
  weight = 700,
  color = "ink",
  id,
  className,
  children,
}: HeadingProps) {
  return (
    <Tag
      id={id}
      className={cn(
        "font-display",
        SIZE_CLASS[size],
        WEIGHT_CLASS[weight],
        COLOR_CLASS[color],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
