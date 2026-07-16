import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { COLOR_CLASS, WEIGHT_CLASS, type TextColor, type TextWeight } from "./typography";

/**
 * Heading — display-font titles. Decouples the semantic level (`as`) from the visual `size`, and
 * pulls weight/colour from the shared typography tokens, so headings stop hand-writing
 * `font-display text-[20px] font-bold text-ink`. Forwards native attributes to the chosen element.
 *
 * Two size families:
 *  - `small`..`xlarge` — FIXED px (15/17/20/24), for in-app panels/rows.
 *  - `h4`..`h1`, `display` — the FLUID marketing scale (tailwind.config fontSize: they scale down on
 *    mobile and carry their own line-height/tracking), for page titles and heroes.
 */
export type HeadingSize =
  | "small"
  | "medium"
  | "large"
  | "xlarge"
  | "h4"
  | "h3"
  | "h2"
  | "h1"
  | "display";

const SIZE_CLASS: Record<HeadingSize, string> = {
  small: "text-ui-lg",
  medium: "text-[17px]",
  large: "text-[20px]",
  xlarge: "text-[24px]",
  h4: "text-h4",
  h3: "text-h3",
  h2: "text-h2",
  h1: "text-h1",
  display: "text-display",
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
