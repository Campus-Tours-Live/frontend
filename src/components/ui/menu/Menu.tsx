import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * MenuSection — a labelled group of MenuItems (optional uppercase header and a
 * top divider between sections). Children should be the rows (MenuItem), each
 * wrapped in an <li>. Styling lives in the design system.
 */
export interface MenuSectionProps {
  label?: ReactNode;
  /** Draw a top divider (use for every section after the first). */
  bordered?: boolean;
  className?: string;
  children: ReactNode;
}

export function MenuSection({ label, bordered = false, className, children }: MenuSectionProps) {
  return (
    <div className={cn("py-4", bordered && "border-t border-border", className)}>
      {label ? (
        <div className="px-2.5 pb-1.5 text-[12px] font-extrabold uppercase tracking-[0.07em] text-ink-soft">
          {label}
        </div>
      ) : null}
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </div>
  );
}
