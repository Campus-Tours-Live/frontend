import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Collapse — a utility container that smoothly expands/collapses its content by height. Control it
 * with `isOpen`; wire the trigger with `aria-expanded` + `aria-controls` pointing at this element's
 * `id`. When closed, the content is kept in the DOM but made `invisible`, so it's removed from tab
 * order and the accessibility tree.
 *
 * Height is animated with the `grid-template-rows: 0fr → 1fr` technique — no JS measurement, and it
 * grows with the content. Respects `prefers-reduced-motion`.
 *
 *   <button aria-expanded={open} aria-controls="more" onClick={() => setOpen(!open)}>Details</button>
 *   <Collapse id="more" isOpen={open}><p>…</p></Collapse>
 */
export interface CollapseProps extends HTMLAttributes<HTMLDivElement> {
  /** @default false */
  isOpen?: boolean;
  children: ReactNode;
}

export function Collapse({ isOpen = false, className, children, ...rest }: CollapseProps) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-in-out motion-reduce:transition-none",
        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        className,
      )}
      {...rest}
    >
      <div className={cn("overflow-hidden", !isOpen && "invisible")}>{children}</div>
    </div>
  );
}
