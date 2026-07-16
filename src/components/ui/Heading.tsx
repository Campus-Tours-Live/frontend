import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { COLOR_CLASS, WEIGHT_CLASS, type TextColor, type TextWeight } from "./typography";

/**
 * Heading — display-font titles. Decouples the semantic level (`as`) from the visual `size`, and
 * pulls weight/colour from the shared typography tokens, so headings stay consistent instead of each
 * call site hand-writing `font-display text-[20px] font-bold text-ink`. Forwards native attributes
 * (`id`, `onClick`, `aria-*`, `style`, …) to the chosen element.
 */
export type HeadingSize = "small" | "medium" | "large" | "xlarge";

const SIZE_CLASS: Record<HeadingSize, string> = {
  small: "text-[15px]",
  medium: "text-[17px]",
  large: "text-[20px]",
  xlarge: "text-[24px]",
};

export interface HeadingProps extends HTMLAttributes<HTMLElement> {
  /** Semantic tag — pick by document outline, independent of `size`. Default `h2`. */
  as?: "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span";
  size?: HeadingSize;
  weight?: TextWeight;
  color?: TextColor;
  children: ReactNode;
}

export function Heading({
  as: Tag = "h2",
  size = "large",
  weight = 700,
  color = "ink",
  className,
  children,
  ...rest
}: HeadingProps) {
  return (
    <Tag
      className={cn(
        "font-display",
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
