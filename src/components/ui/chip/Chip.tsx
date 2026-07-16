import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Chip — selectable pill (`.chip`). Toggle the `active` state from the parent
 * (controlled). Renders a real <button> with aria-pressed for accessibility.
 * Styles live in globals.css.
 */
export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: "small" | "medium";
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { active = false, size = "medium", className, type, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-pressed={active}
      className={cn("chip", active && "active", size === "small" && "chip-sm", className)}
      {...props}
    />
  );
});
