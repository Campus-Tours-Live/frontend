import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { COLOR_CLASS, WEIGHT_CLASS, type TextColor, type TextWeight } from "./typography";

/**
 * Body — sans-font running text. Pairs with {@link Heading}: same weight/colour tokens, a small size
 * scale, so paragraphs and labels stop hand-writing `text-[13px] text-ink-soft` everywhere. `as` is a
 * text-level tag (p default; also span/div for inline/wrapping, or description/legend tags dt/dd/legend).
 * It is deliberately NOT a list container: `ul`/`li` structure belongs to {@link List}/{@link ListItem}.
 * `lead` is the fluid marketing lead size (16–18px). Forwards native attributes to the element.
 */
export type BodySize = "small" | "medium" | "large" | "lead";

/** The text-level tags Body may render as — intentionally excludes list tags (ul/li → List/ListItem). */
export type BodyAs = "p" | "span" | "div" | "dt" | "dd" | "legend";

const SIZE_CLASS: Record<BodySize, string> = {
  small: "text-[13px]",
  medium: "text-ui",
  large: "text-[15px]",
  lead: "text-lead",
};

export interface BodyProps extends HTMLAttributes<HTMLElement> {
  /** Text-level tag to render. Default `p`. span/div for inline/wrapping, or dt/dd/legend.
   *  Not a list container — use {@link List}/{@link ListItem} for ul/li. */
  as?: BodyAs;
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
