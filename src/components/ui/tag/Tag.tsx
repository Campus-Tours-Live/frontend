import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tag — a small, visual-only, non-interactive label that draws focus to a trait: status,
 * availability, a rating, a category. Comes in six colours and three emphasis variants, with an
 * optional leading icon. For the brand-token status pills, prefer Badge/StatusBadge; reach for Tag
 * when you need the wider colour × emphasis matrix.
 *
 *   <Tag color="green" leading={<Icon name="success" />}>Confirmed</Tag>
 *   <Tag color="spark" variant="primary">New</Tag>
 */
export type TagColor = "blue" | "gray" | "green" | "red" | "purple" | "spark";
export type TagVariant = "primary" | "secondary" | "tertiary";

// Literal class strings (Tailwind can't JIT interpolated `bg-${color}-…`), all mapped to the app's
// theme tokens. primary = solid emphasis, secondary = soft tint (default), tertiary = softest.
const TAG_STYLES: Record<TagColor, Record<TagVariant, string>> = {
  blue: {
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-primary-soft text-primary-dark",
    tertiary: "bg-primary-soft/60 text-primary-dark",
  },
  gray: {
    primary: "bg-ink text-white",
    secondary: "bg-muted text-ink",
    tertiary: "bg-muted/60 text-ink-soft",
  },
  green: {
    primary: "bg-success text-success-foreground",
    secondary: "bg-success-soft text-success-foreground",
    tertiary: "bg-success-soft/60 text-success-foreground",
  },
  red: {
    primary: "bg-error text-error-foreground",
    secondary: "bg-error-soft text-error-foreground",
    tertiary: "bg-error-soft/60 text-error-foreground",
  },
  purple: {
    primary: "bg-purple text-purple-foreground",
    secondary: "bg-purple-soft text-purple-foreground",
    tertiary: "bg-purple-soft/60 text-purple-foreground",
  },
  spark: {
    primary: "bg-warning text-warning-foreground",
    secondary: "bg-warning-soft text-warning-foreground",
    tertiary: "bg-warning-soft/60 text-warning-foreground",
  },
};

export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
  children: ReactNode;
  /** @default "blue" */
  color?: TagColor;
  /** @default "secondary" */
  variant?: TagVariant;
  /** Leading content (usually an icon). */
  leading?: ReactNode;
}

export function Tag({
  children,
  color = "blue",
  variant = "secondary",
  leading,
  className,
  ...rest
}: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-pill px-2 py-0.5 text-[12px] font-semibold leading-5",
        TAG_STYLES[color][variant],
        className,
      )}
      {...rest}
    >
      {leading ? (
        <span className="inline-flex shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">{leading}</span>
      ) : null}
      {children}
    </span>
  );
}
