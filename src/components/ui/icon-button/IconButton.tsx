import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ForwardedRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { glassClass } from "../glass/Glass";

/**
 * IconButton — an icon-only control. Because it has no visible text, `a11yLabel` is REQUIRED and
 * becomes the accessible name. Renders a `<button>` by default, or an `<a>` when given `href`
 * (tab-nabbing-safe: `rel="noopener noreferrer"` is defaulted for `target="_blank"`). Forwards
 * `ref` and spreads the rest (`onClick`, `id`, `data-*`…), so analytics live at the call site while
 * the a11y + focus/hover styling stay centralised.
 *
 *   <IconButton a11yLabel="More" onClick={…}><Icon name="more" /></IconButton>
 *   <IconButton a11yLabel="Help" href="/help"><Icon name="info" /></IconButton>
 */
export type IconButtonSize = "small" | "medium" | "large";
export type IconButtonVariant = "ghost" | "soft" | "glass";

interface IconButtonOwnProps {
  /** Accessible name (icon-only button has no visible text) — required. */
  a11yLabel: string;
  /** The icon element, e.g. `<Icon name="more" />`. */
  children: ReactNode;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  className?: string;
}

type ButtonRest = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "className" | "children"
>;
type AnchorRest = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "aria-label" | "className" | "children"
>;

export type IconButtonProps = IconButtonOwnProps &
  ((ButtonRest & { href?: undefined }) | (AnchorRest & { href: string }));

const SIZE_CLASS: Record<IconButtonSize, string> = {
  small: "h-8 w-8",
  medium: "h-9 w-9",
  large: "h-11 w-11",
};

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
  // Neutral hover (surfaces on the ivory ground).
  ghost: "text-ink-soft hover:bg-canvas hover:text-ink",
  // Brand-tinted hover (matches the calendar/nav chevrons).
  soft: "text-ink-soft hover:bg-primary-soft hover:text-primary",
  // Frosted-glass control for photo / dark grounds — reuses the shared Glass surface.
  glass: glassClass("light", "hover:bg-ivory/40"),
};

export const IconButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, IconButtonProps>(
  function IconButton(
    { a11yLabel, children, size = "medium", variant = "ghost", className, ...rest },
    ref,
  ) {
    const classes = cn(
      "inline-flex shrink-0 items-center justify-center rounded-full transition-colors",
      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-soft",
      "disabled:cursor-not-allowed disabled:opacity-40",
      SIZE_CLASS[size],
      VARIANT_CLASS[variant],
      className,
    );

    if (rest.href !== undefined) {
      const { href, target, rel, ...anchorRest } = rest as AnchorRest & { href: string };
      const safeRel = rel ?? (target === "_blank" ? "noopener noreferrer" : undefined);
      return (
        <a
          ref={ref as ForwardedRef<HTMLAnchorElement>}
          aria-label={a11yLabel}
          className={classes}
          href={href}
          target={target}
          rel={safeRel}
          {...anchorRest}
        >
          {children}
        </a>
      );
    }

    const { type = "button", ...buttonRest } = rest as ButtonRest;
    return (
      <button
        ref={ref as ForwardedRef<HTMLButtonElement>}
        type={type}
        aria-label={a11yLabel}
        className={classes}
        {...buttonRest}
      >
        {children}
      </button>
    );
  },
);
