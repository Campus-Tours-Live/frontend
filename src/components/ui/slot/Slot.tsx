import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal Slot for `asChild` composition: applies the given props/className onto
 * a single child element instead of rendering a wrapper. className is merged; the
 * child's own props win for everything else.
 *
 * Intentionally lightweight (no ref/handler merging). If we later need full
 * composition (merged refs, chained handlers), swap in @radix-ui/react-slot.
 */
export function Slot({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string } & Record<string, unknown>) {
  if (!isValidElement(children)) return null;
  const child = children as ReactElement<{ className?: string }>;
  return cloneElement(child, {
    ...props,
    ...child.props,
    className: cn(className, child.props.className),
  });
}
