import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { COLOR_CLASS, WEIGHT_CLASS, type TextColor, type TextWeight } from "./typography";

/**
 * Body — sans-font running text (p / span / div). Pairs with {@link Heading}: same weight/colour
 * tokens, a small size scale, so paragraphs and labels stop hand-writing `text-[13px] text-ink-soft`
 * everywhere.
 */
export type BodySize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<BodySize, string> = {
  sm: "text-[13px]",
  md: "text-[14px]",
  lg: "text-[15px]",
};

export interface BodyProps {
  /** Element to render. Default `p`. Use `span`/`div` for inline or wrapping text. */
  as?: "p" | "span" | "div";
  size?: BodySize;
  weight?: TextWeight;
  color?: TextColor;
  className?: string;
  children: ReactNode;
}

export function Body({
  as: Tag = "p",
  size = "md",
  weight = 400,
  color = "ink",
  className,
  children,
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
    >
      {children}
    </Tag>
  );
}
