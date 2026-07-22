import { type ElementType, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Container — the shared centered content row: `mx-auto max-w-content px-6`. Every page section
 * that wants the standard page gutter + max width uses this instead of hand-rolling those classes.
 *
 * It owns ONLY horizontal framing (centering, max-width, side padding). Vertical rhythm (`py-*`),
 * grid/flex layout, and full-bleed band backgrounds stay on the caller via `className`/wrappers —
 * they vary too much per section to bake in.
 *
 *  - `width="content"` (default) caps at `max-w-content` (1180px).
 *  - `width="wide"` keeps that cap but relaxes it on very large screens (xl/2xl) for gallery pages.
 *
 * `as` sets the element (div / section / main / …); default `div`.
 */
export type ContainerWidth = "content" | "wide";

const WIDTH_CLASS: Record<ContainerWidth, string> = {
  content: "",
  wide: "xl:max-w-[1280px] 2xl:max-w-[1400px]",
};

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  /** Element to render. @default "div" */
  as?: ElementType;
  /** Max-width behaviour. @default "content" */
  width?: ContainerWidth;
}

export function Container({
  as: Tag = "div",
  width = "content",
  className,
  children,
  ...rest
}: ContainerProps) {
  return (
    <Tag className={cn("mx-auto max-w-content px-6", WIDTH_CLASS[width], className)} {...rest}>
      {children}
    </Tag>
  );
}
