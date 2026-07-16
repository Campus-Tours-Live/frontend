import NextLink from "next/link";
import { forwardRef, type AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { buttonClasses, type ButtonVariant, type ButtonSize } from "../button/Button";

/**
 * Link — wraps next/link with two conveniences:
 *
 * 1. `variant` renders it as a button-styled link (shares Button's classes).
 *    Without a variant it's a plain text link and inherits the global link
 *    affordance (colour + underline on hover/focus) from globals.css.
 * 2. Full-page navigation: absolute URLs, BFF routes (/auth, /api, /v1),
 *    mailto/tel, and hash links render a plain <a> (client routing would be
 *    wrong for those). Everything else uses next/link. Override via `external`.
 */
export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  external?: boolean;
}

const ABSOLUTE = /^(https?:)?\/\//i;

function needsFullNav(href: string): boolean {
  return (
    ABSOLUTE.test(href) ||
    href.startsWith("/auth") ||
    href.startsWith("/api") ||
    href.startsWith("/v1") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#")
  );
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, variant, size, block, external, className, children, target, rel, ...props },
  ref,
) {
  // Only add button classes when a variant is requested; otherwise leave
  // className undefined so plain text links keep the global link styling.
  const classes = cn(variant && buttonClasses({ variant, size, block }), className) || undefined;

  // A link that opens a new tab must not leak the opener (tab-nabbing) — default `rel` to
  // `noopener noreferrer` for `target="_blank"` unless the caller set one explicitly.
  const safeRel = rel ?? (target === "_blank" ? "noopener noreferrer" : undefined);

  if (external ?? needsFullNav(href)) {
    return (
      <a ref={ref} href={href} className={classes} target={target} rel={safeRel} {...props}>
        {children}
      </a>
    );
  }

  return (
    <NextLink ref={ref} href={href} className={classes} target={target} rel={safeRel} {...props}>
      {children}
    </NextLink>
  );
});
