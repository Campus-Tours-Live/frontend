import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * IconButton — an icon-only button. Because it has no visible text, `a11yLabel` is REQUIRED and
 * becomes the button's accessible name. Forwards `ref` and spreads the rest (`onClick`, `id`,
 * `data-*`, event handlers…), so instrumentation/analytics attributes live at the call site while
 * the a11y + focus/hover styling stay centralised.
 *
 *   <IconButton a11yLabel="More" onClick={…}><Icon name="more" /></IconButton>
 */
export type IconButtonSize = "sm" | "md";
export type IconButtonVariant = "ghost" | "soft";

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label"
> {
  /** Accessible name (icon-only button has no visible text) — required. */
  a11yLabel: string;
  /** The icon element, e.g. `<Icon name="more" />`. */
  children: ReactNode;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
}

const SIZE_CLASS: Record<IconButtonSize, string> = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
};

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
  // Neutral hover (surfaces on the ivory ground).
  ghost: "text-ink-soft hover:bg-canvas hover:text-ink",
  // Brand-tinted hover (matches the calendar/nav chevrons).
  soft: "text-ink-soft hover:bg-primary-soft hover:text-primary",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { a11yLabel, children, size = "md", variant = "ghost", type = "button", className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={a11yLabel}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-soft",
        "disabled:cursor-not-allowed disabled:opacity-40",
        SIZE_CLASS[size],
        VARIANT_CLASS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
