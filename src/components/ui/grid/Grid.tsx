import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Grid — a 12-column layout grid. Place {@link GridColumn}s inside and size them per breakpoint.
 * `hasGutter` adds spacing between columns (and rows, when they wrap).
 *
 *   <Grid hasGutter>
 *     <GridColumn sm={12} md={6} lg={4}>A</GridColumn>
 *     <GridColumn sm={12} md={6} lg={4}>B</GridColumn>
 *     <GridColumn sm={12} md={12} lg={4}>C</GridColumn>
 *   </Grid>
 */
export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Gutter spacing between columns. Default false. */
  hasGutter?: boolean;
}

export function Grid({ hasGutter = false, className, children, ...rest }: GridProps) {
  return (
    <div className={cn("grid grid-cols-12", hasGutter && "gap-4", className)} {...rest}>
      {children}
    </div>
  );
}
