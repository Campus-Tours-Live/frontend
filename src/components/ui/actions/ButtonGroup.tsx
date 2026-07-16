"use client";

import { cn } from "@/lib/utils/cn";
import type { SegmentOption } from "../forms/SegmentedControl";

export interface ButtonGroupProps<T extends string> {
  /** Options in visual order, left → right. */
  options: readonly SegmentOption<T>[];
  /** Controlled selection (this component is always controlled). */
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group (required). */
  "aria-label": string;
  size?: "small" | "medium";
  className?: string;
}

/**
 * ButtonGroup — a single-select row of pill buttons where the selected one fills. No sliding
 * highlight; each button owns its own state styling. Use {@link SegmentedControl} for the
 * animated, flush-segment variant.
 */
export function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
  size = "medium",
  className,
  "aria-label": ariaLabel,
}: ButtonGroupProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("grid w-full gap-1 rounded-full border border-border bg-card p-1", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full transition-colors",
              size === "small" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-[13px]",
              isSelected
                ? "bg-primary font-semibold text-primary-foreground"
                : "font-medium text-ink-soft hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
