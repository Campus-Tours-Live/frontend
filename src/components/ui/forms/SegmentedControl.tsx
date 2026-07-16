"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  /** Options in visual order, left → right. */
  options: readonly SegmentOption<T>[];
  /** Controlled selection. Omit to run uncontrolled (see `defaultValue`). */
  value?: T;
  /** Uncontrolled initial selection. When omitted, the **rightmost** option starts selected. */
  defaultValue?: T;
  onChange?: (value: T) => void;
  /** Accessible name for the control (required). */
  "aria-label": string;
  size?: "small" | "medium";
  className?: string;
}

/**
 * SegmentedControl — a single-select pill with a highlight that **slides** between options
 * (iOS-style). Drive it controlled with `value`/`onChange`, or uncontrolled with `defaultValue`
 * (falling back to the rightmost option when none is given). Segments sit flush so the sliding
 * thumb lands exactly on each; use {@link ButtonGroup} for the non-animated, per-button variant.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  defaultValue,
  onChange,
  size = "medium",
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<T | undefined>(
    () => defaultValue ?? options[options.length - 1]?.value,
  );
  const selected = isControlled ? value : internal;
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selected),
  );

  const select = (next: T) => {
    if (!isControlled) setInternal(next);
    if (next !== selected) onChange?.(next);
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "relative isolate grid w-full rounded-full border border-border bg-card p-1",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {/* Sliding highlight — width of one segment, translated to the active one. Purely
          decorative (the buttons carry the selected state), so it is aria-hidden. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-1 -z-10 rounded-full bg-primary transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => select(option.value)}
            className={cn(
              "rounded-full font-semibold transition-colors",
              size === "small" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-[13px]",
              isSelected ? "text-primary-foreground" : "text-ink-soft hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
