import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { COLOR_CLASS, WEIGHT_CLASS, type TextColor, type TextWeight } from "./typography";

/**
 * Body — sans-font running text (p / span / div). Pairs with {@link Heading}: same weight/colour
 * tokens, a small size scale, so paragraphs and labels stop hand-writing `text-[13px] text-ink-soft`
 * everywhere. Forwards native attributes (`id`, `onClick`, `aria-*`, `style`, …) to the element.
 */
export type BodySize = "small" | "medium" | "large";

const SIZE_CLASS: Record<BodySize, string> = {
  small: "text-[13px]",
  medium: "text-[14px]",
  large: "text-[15px]",
};

export interface BodyProps extends HTMLAttributes<HTMLElement> {
  /** Element to render. Default `p`. Use `span`/`div` for inline or wrapping text. */
  as?: "p" | "span" | "div";
  size?: BodySize;
  weight?: TextWeight;
  color?: TextColor;
  children: ReactNode;
}

export function Body({
  as: Tag = "p",
  size = "medium",
  weight = 400,
  color = "ink",
  className,
  children,
  ...rest
}: BodyProps) {
  return (
    <Tag
      className={cn(
        "font-sans",
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
