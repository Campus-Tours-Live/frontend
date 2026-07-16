import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ButtonRow — lays out related action buttons in a horizontal row with consistent spacing (e.g. a
 * card/dialog footer: Cancel + Submit). Wraps on narrow widths. Defaults to right-aligned (`end`),
 * the footer convention; use `align` for other placements.
 *
 * (This is the layout for *action* buttons. For a single-select segmented pill control, use
 * {@link SegmentedControl} / {@link ButtonGroup}.)
 *
 *   <ButtonRow>
 *     <Button variant="secondary">Cancel</Button>
 *     <Button variant="primary">Submit</Button>
 *   </ButtonRow>
 */
export type ButtonRowAlign = "start" | "center" | "end" | "between";

export interface ButtonRowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Horizontal alignment. Default `end`. */
  align?: ButtonRowAlign;
}

const JUSTIFY: Record<ButtonRowAlign, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

export function ButtonRow({ align = "end", className, children, ...rest }: ButtonRowProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", JUSTIFY[align], className)} {...rest}>
      {children}
    </div>
  );
}
