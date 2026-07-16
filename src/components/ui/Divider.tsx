import { cn } from "@/lib/utils";

/**
 * Divider — a hairline rule, horizontal (default) or vertical. Centralises the border colour and the
 * "inset" gutter used by {@link Panel}, so separators don't get hand-written as ad-hoc `border-t`s.
 *
 * `inset` keeps the rule clear of its container's edges by the standard gutter (aligns with padded
 * content); omit it for an edge-to-edge rule.
 */
export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  inset?: boolean;
  className?: string;
}

export function Divider({ orientation = "horizontal", inset = false, className }: DividerProps) {
  const horizontal = orientation === "horizontal";
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0 border-border",
        horizontal ? "border-t" : "self-stretch border-l",
        inset && (horizontal ? "mx-5 sm:mx-6" : "my-4"),
        className,
      )}
    />
  );
}
