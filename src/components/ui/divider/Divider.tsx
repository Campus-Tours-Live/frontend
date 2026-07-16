import { cn } from "@/lib/utils";

/**
 * Divider — a hairline rule. Decorative by default: hidden from screen readers (like a plain `<hr>`
 * used for visual separation). Pass `title` to announce it as a MEANINGFUL separator instead.
 * Horizontal (default) or vertical, with an optional `inset` gutter that keeps it clear of the
 * container's edges so it aligns with padded content (matches Panel / List rows).
 *
 *   <Divider />                       // decorative
 *   <Divider inset />                 // inset from the edges
 *   <Divider title="Billing" />       // meaningful, labelled separator
 */
export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  inset?: boolean;
  /** Accessible label — makes the divider a meaningful separator. Omit for a decorative rule. */
  title?: string;
  className?: string;
}

export function Divider({
  orientation = "horizontal",
  inset = false,
  title,
  className,
}: DividerProps) {
  const horizontal = orientation === "horizontal";
  const decorative = title === undefined;
  return (
    <div
      role={decorative ? undefined : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      aria-label={title}
      aria-hidden={decorative || undefined}
      className={cn(
        "shrink-0 border-border",
        horizontal ? "border-t" : "self-stretch border-l",
        inset && (horizontal ? "mx-5 sm:mx-6" : "my-4"),
        className,
      )}
    />
  );
}
