import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./Skeleton";

/**
 * SkeletonText — a stack of {@link Skeleton} lines approximating a paragraph. The last line is
 * shortened (like real ragged text) when there's more than one. Decorative (`aria-hidden`).
 *
 *   <SkeletonText />          // 3 lines
 *   <SkeletonText lines={2} />
 */
export interface SkeletonTextProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Number of lines. Default 3. */
  lines?: number;
}

export function SkeletonText({ lines = 3, className, ...props }: SkeletonTextProps) {
  return (
    <div aria-hidden className={cn("flex flex-col gap-2", className)} {...props}>
      {Array.from({ length: Math.max(0, lines) }).map((_, index) => (
        <Skeleton
          key={index}
          height={12}
          width={index === lines - 1 && lines > 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}
