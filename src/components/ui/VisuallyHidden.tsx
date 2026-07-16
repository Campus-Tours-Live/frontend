import { type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * VisuallyHidden — content available to screen readers but hidden visually (Tailwind's `sr-only`).
 * Use for accessible labels on icon-only controls, or as a polite live region for status text.
 * Forwards native attributes (`id`, `aria-live`, `role`, …) and can render as any element via `as`.
 *
 *   <VisuallyHidden>Loading</VisuallyHidden>
 *   <VisuallyHidden aria-live="polite" aria-atomic>{remaining} left</VisuallyHidden>
 */
export interface VisuallyHiddenProps extends HTMLAttributes<HTMLElement> {
  /** Element to render. Default `span`. */
  as?: ElementType;
  children?: ReactNode;
}

export function VisuallyHidden({
  as: Tag = "span",
  className,
  children,
  ...rest
}: VisuallyHiddenProps) {
  return (
    <Tag className={cn("sr-only", className)} {...rest}>
      {children}
    </Tag>
  );
}
