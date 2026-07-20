import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ForwardedRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { glassClass, type GlassTone } from "../glass/Glass";

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
export type IconButtonVariant = "ghost" | "soft" | "glass" | "solid" | "card";

interface IconButtonOwnProps {
  /** Accessible name (icon-only button has no visible text) — required. */
  a11yLabel: string;
  /** The icon element, e.g. `<Icon name="more" />`. */
  children: ReactNode;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  /**
   * Which glass material the `glass` variant uses — ignored by every other variant. Default
   * `"light"` (ivory material, for DARK / photo grounds).
   *
   * Pass `"smoke"` for a control over caller-supplied imagery: it is the only tone that stays
   * legible on both a pale illustration and a dark photo. This used to be hard-coded to `"light"`,
   * which is why the tour card's save heart vanished on a cream sky. See {@link GlassTone}.
   */
  tone?: GlassTone;
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

const STATIC_VARIANT_CLASS: Record<Exclude<IconButtonVariant, "glass">, string> = {
  // Neutral hover (surfaces on the ivory ground).
  ghost: "text-ink-soft hover:bg-canvas hover:text-ink",
  // Brand-tinted hover (matches the calendar/nav chevrons).
  soft: "text-ink-soft hover:bg-primary-soft hover:text-primary",
  // Filled brand action — the primary icon-only CTA (e.g. the header search submit).
  solid: "bg-primary text-primary-foreground hover:bg-primary-dark",
  // Bordered card pill on the page surface — brand-tinted on hover (e.g. carousel chevrons).
  card: "border border-border bg-card text-ink shadow-card hover:border-primary hover:text-primary",
};

/** Hover tint stays inside each tone's own palette, so it can never invert the material's contrast. */
const GLASS_HOVER: Record<GlassTone, string> = {
  light: "hover:bg-ivory/40",
  dark: "hover:bg-card/90",
  smoke: "hover:bg-ink/38",
};

function variantClass(variant: IconButtonVariant, tone: GlassTone): string {
  // Frosted-glass control over imagery — reuses the shared Glass material. `tone` comes from the
  // call site because only it knows the ground; see GlassTone.
  return variant === "glass" ? glassClass(tone, GLASS_HOVER[tone]) : STATIC_VARIANT_CLASS[variant];
}

export const IconButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, IconButtonProps>(
  function IconButton(
    { a11yLabel, children, size = "medium", variant = "ghost", tone = "light", className, ...rest },
    ref,
  ) {
    const classes = cn(
      "inline-flex shrink-0 items-center justify-center rounded-full transition-colors",
      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-soft",
      "disabled:cursor-not-allowed disabled:opacity-40",
      SIZE_CLASS[size],
      variantClass(variant, tone),
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
