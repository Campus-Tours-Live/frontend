import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * LineClamp — truncates text to a fixed number of lines with an ellipsis (CSS `-webkit-line-clamp`,
 * supported across modern browsers). Style-agnostic; inherits the surrounding font.
 *
 *   <LineClamp lines={3}>{longDescription}</LineClamp>
 */
export interface LineClampProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  /** Number of visible lines before truncating. @default 2 */
  lines?: number;
}

// Literal classes for the common counts (Tailwind can't JIT `line-clamp-${n}`); larger counts fall
// back to inline styles.
const CLAMP_CLASS: Record<number, string> = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
  6: "line-clamp-6",
};

const CLAMP_STYLE: CSSProperties = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

export function LineClamp({ lines = 2, className, style, children, ...rest }: LineClampProps) {
  const clampClass = CLAMP_CLASS[lines];
  return (
    <span
      className={cn(clampClass, className)}
      style={clampClass ? style : { ...CLAMP_STYLE, WebkitLineClamp: lines, ...style }}
      {...rest}
    >
      {children}
    </span>
  );
}
