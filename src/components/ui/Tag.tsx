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

// Literal class strings (Tailwind can't JIT interpolated `bg-${color}-…`). primary = solid emphasis,
// secondary = soft tint (default), tertiary = subtle low-visibility.
const TAG_STYLES: Record<TagColor, Record<TagVariant, string>> = {
  blue: {
    primary: "bg-blue-600 text-white",
    secondary: "bg-blue-100 text-blue-800",
    tertiary: "bg-blue-50 text-blue-700",
  },
  gray: {
    primary: "bg-slate-600 text-white",
    secondary: "bg-slate-100 text-slate-800",
    tertiary: "bg-slate-50 text-slate-700",
  },
  green: {
    primary: "bg-emerald-600 text-white",
    secondary: "bg-emerald-100 text-emerald-800",
    tertiary: "bg-emerald-50 text-emerald-700",
  },
  red: {
    primary: "bg-red-600 text-white",
    secondary: "bg-red-100 text-red-800",
    tertiary: "bg-red-50 text-red-700",
  },
  purple: {
    primary: "bg-violet-600 text-white",
    secondary: "bg-violet-100 text-violet-800",
    tertiary: "bg-violet-50 text-violet-700",
  },
  spark: {
    // Amber is too light for white text — use dark text on the solid variant.
    primary: "bg-amber-400 text-amber-950",
    secondary: "bg-amber-100 text-amber-800",
    tertiary: "bg-amber-50 text-amber-700",
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
