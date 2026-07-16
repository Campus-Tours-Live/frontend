import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * GridColumn — a child of {@link Grid} that spans 1–12 of the 12 columns, per breakpoint. `sm` is
 * the base (mobile) span; `md`/`lg`/`xl`/`xxl` override it upward. Spans should add to 12 per row.
 *
 * Breakpoints map to Tailwind's: `sm` = base, `md` = md, `lg` = lg, `xl` = xl, `xxl` = 2xl.
 */
export type GridColumnSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

// Full literal class names — Tailwind's JIT only generates classes it can see verbatim in source,
// so `col-span-${n}` won't work; these maps do.
const BASE: Record<GridColumnSpan, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
};
const MD: Record<GridColumnSpan, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
  9: "md:col-span-9",
  10: "md:col-span-10",
  11: "md:col-span-11",
  12: "md:col-span-12",
};
const LG: Record<GridColumnSpan, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  10: "lg:col-span-10",
  11: "lg:col-span-11",
  12: "lg:col-span-12",
};
const XL: Record<GridColumnSpan, string> = {
  1: "xl:col-span-1",
  2: "xl:col-span-2",
  3: "xl:col-span-3",
  4: "xl:col-span-4",
  5: "xl:col-span-5",
  6: "xl:col-span-6",
  7: "xl:col-span-7",
  8: "xl:col-span-8",
  9: "xl:col-span-9",
  10: "xl:col-span-10",
  11: "xl:col-span-11",
  12: "xl:col-span-12",
};
const XXL: Record<GridColumnSpan, string> = {
  1: "2xl:col-span-1",
  2: "2xl:col-span-2",
  3: "2xl:col-span-3",
  4: "2xl:col-span-4",
  5: "2xl:col-span-5",
  6: "2xl:col-span-6",
  7: "2xl:col-span-7",
  8: "2xl:col-span-8",
  9: "2xl:col-span-9",
  10: "2xl:col-span-10",
  11: "2xl:col-span-11",
  12: "2xl:col-span-12",
};

export interface GridColumnProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Base (mobile) span. Default 12 (full width). */
  sm?: GridColumnSpan;
  md?: GridColumnSpan;
  lg?: GridColumnSpan;
  xl?: GridColumnSpan;
  xxl?: GridColumnSpan;
}

export function GridColumn({
  sm = 12,
  md,
  lg,
  xl,
  xxl,
  className,
  children,
  ...rest
}: GridColumnProps) {
  return (
    <div
      className={cn(
        BASE[sm],
        md != null && MD[md],
        lg != null && LG[lg],
        xl != null && XL[xl],
        xxl != null && XXL[xxl],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
