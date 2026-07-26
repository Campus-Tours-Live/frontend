import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Slot } from "../slot/Slot";
import { Spinner } from "../spinner/Spinner";

/**
 * Button — wraps the design-system `.btn` classes (styles live in globals.css).
 * Variants/sizes map to literal class names so Tailwind's scanner keeps them.
 *
 * - `asChild` renders the button styles onto a child element (e.g. a Link),
 *   so anchors can look like buttons without duplicating classes.
 * - `buttonClasses` is exported so other elements (e.g. Link) can opt into the
 *   same styling.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "accent";
export type ButtonSize = "small" | "medium" | "large";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  accent: "btn-accent",
};

const SIZE: Record<ButtonSize, string> = {
  small: "btn-sm",
  medium: "", // default size lives in `.btn`
  large: "btn-lg",
};

export function buttonClasses(
  opts: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean } = {},
): string {
  const { variant = "primary", size = "medium", block = false } = opts;
  return cn("btn", VARIANT[variant], SIZE[size], block && "btn-block");
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** Apply the button styling to the single child element instead of a <button>. */
  asChild?: boolean;
  /**
   * Show a leading spinner and disable the button while an action is in flight (e.g. a submit).
   * The caller still supplies the label — swap it to a progress verb ("Saving…") when loading.
   * Ignored with `asChild` (Slot forwards to a single child, which a spinner would break).
   */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, asChild, loading = false, className, type, children, disabled, ...props },
  ref,
) {
  const classes = cn(buttonClasses({ variant, size, block }), className);

  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    // Default to type="button" so a Button never submits a form unintentionally.
    <button
      ref={ref}
      type={type ?? "button"}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size={16} /> : null}
      {children}
    </button>
  );
});
