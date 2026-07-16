import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton — a low-fidelity, pulsing placeholder that approximates a piece of UI while its content
 * loads. Give it `width`/`height` to match the real element; a group of them roughly matching a
 * screen improves perceived responsiveness. Decorative (`aria-hidden`).
 *
 *   <Skeleton height={60} width="50%" />
 *   <Skeleton variant="rounded" height={40} width={40} />   // avatar
 */
export type SkeletonVariant = "rectangle" | "rounded";

export interface SkeletonProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  width?: number | string;
  height?: number | string;
  /** `rectangle` = slightly rounded corners (default); `rounded` = fully rounded (pills/avatars). */
  variant?: SkeletonVariant;
}

export function Skeleton({
  variant = "rectangle",
  width,
  height,
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse bg-muted",
        variant === "rectangle" ? "rounded-md" : "rounded-pill",
        className,
      )}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}
