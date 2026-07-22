import { type HTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tag — a small label that draws focus to a trait: status, availability, a rating, a category.
 * Comes in two colour groups — eight semantic brand hues, plus the eight `--topic-*` categorical
 * colours the tour cards key off — across four emphasis variants, with an optional leading icon. For the brand-token status pills, prefer Badge/StatusBadge; reach
 * for Tag when you need the wider colour × emphasis matrix.
 *
 * Presentational by default; passing `onRemove` turns it into a removable token and renders a real
 * remove `<button>` inside it, so the Tag is then interactive.
 *
 *   <Tag color="green" leading={<Icon name="success" />}>Confirmed</Tag>
 *   <Tag color="spark" variant="primary">New</Tag>
 */
export type TagColor =
  | "blue"
  | "gray"
  | "green"
  | "red"
  | "purple"
  | "spark"
  | "coral"
  | "sage"
  | "blush"
  | "rust"
  | "olive"
  | "moss"
  | "lagoon"
  | "azure"
  | "iris"
  | "mauve";
export type TagVariant = "primary" | "secondary" | "tertiary" | "inverse";

// Literal class strings (Tailwind can't JIT interpolated `bg-${color}-…`), all mapped to the app's
// theme tokens. primary = solid emphasis, secondary = soft tint (default), tertiary = softest,
// inverse = deep colour fill with light text (a bold, high-contrast chip — e.g. a category pill).
const TAG_STYLES: Record<TagColor, Record<TagVariant, string>> = {
  blue: {
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-primary-soft text-primary-dark",
    tertiary: "bg-primary-soft/60 text-primary-dark",
    inverse: "bg-primary-dark text-ivory",
  },
  gray: {
    primary: "bg-ink text-white",
    secondary: "bg-muted text-ink",
    tertiary: "bg-muted/60 text-ink-soft",
    inverse: "bg-ink text-white",
  },
  green: {
    primary: "bg-success text-success-foreground",
    secondary: "bg-success-soft text-success-foreground",
    tertiary: "bg-success-soft/60 text-success-foreground",
    inverse: "bg-success-foreground text-ivory",
  },
  red: {
    primary: "bg-error text-error-foreground",
    secondary: "bg-error-soft text-error-foreground",
    tertiary: "bg-error-soft/60 text-error-foreground",
    inverse: "bg-error-foreground text-ivory",
  },
  purple: {
    primary: "bg-purple text-purple-foreground",
    secondary: "bg-purple-soft text-purple-foreground",
    tertiary: "bg-purple-soft/60 text-purple-foreground",
    inverse: "bg-purple-foreground text-ivory",
  },
  blush: {
    primary: "bg-blush text-blush-foreground",
    secondary: "bg-blush-soft text-blush-foreground",
    tertiary: "bg-blush-soft/60 text-blush-foreground",
    inverse: "bg-blush-foreground text-ivory",
  },
  rust: {
    primary: "bg-rust text-rust-foreground",
    secondary: "bg-rust-soft text-rust-foreground",
    tertiary: "bg-rust-soft/60 text-rust-foreground",
    inverse: "bg-rust-foreground text-ivory",
  },
  olive: {
    primary: "bg-olive text-olive-foreground",
    secondary: "bg-olive-soft text-olive-foreground",
    tertiary: "bg-olive-soft/60 text-olive-foreground",
    inverse: "bg-olive-foreground text-ivory",
  },
  moss: {
    primary: "bg-moss text-moss-foreground",
    secondary: "bg-moss-soft text-moss-foreground",
    tertiary: "bg-moss-soft/60 text-moss-foreground",
    inverse: "bg-moss-foreground text-ivory",
  },
  lagoon: {
    primary: "bg-lagoon text-lagoon-foreground",
    secondary: "bg-lagoon-soft text-lagoon-foreground",
    tertiary: "bg-lagoon-soft/60 text-lagoon-foreground",
    inverse: "bg-lagoon-foreground text-ivory",
  },
  azure: {
    primary: "bg-azure text-azure-foreground",
    secondary: "bg-azure-soft text-azure-foreground",
    tertiary: "bg-azure-soft/60 text-azure-foreground",
    inverse: "bg-azure-foreground text-ivory",
  },
  iris: {
    primary: "bg-iris text-iris-foreground",
    secondary: "bg-iris-soft text-iris-foreground",
    tertiary: "bg-iris-soft/60 text-iris-foreground",
    inverse: "bg-iris-foreground text-ivory",
  },
  mauve: {
    primary: "bg-mauve text-mauve-foreground",
    secondary: "bg-mauve-soft text-mauve-foreground",
    tertiary: "bg-mauve-soft/60 text-mauve-foreground",
    inverse: "bg-mauve-foreground text-ivory",
  },
  spark: {
    primary: "bg-warning text-warning-foreground",
    secondary: "bg-warning-soft text-warning-foreground",
    tertiary: "bg-warning-soft/60 text-warning-foreground",
    inverse: "bg-warning-foreground text-ivory",
  },
  coral: {
    primary: "bg-coral text-coral-foreground",
    secondary: "bg-coral-soft text-coral-foreground",
    tertiary: "bg-coral-soft/60 text-coral-foreground",
    inverse: "bg-coral-foreground text-ivory",
  },
  sage: {
    primary: "bg-sage text-sage-foreground",
    secondary: "bg-sage-soft text-sage-foreground",
    tertiary: "bg-sage-soft/60 text-sage-foreground",
    inverse: "bg-sage-foreground text-ivory",
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
  /** When set, renders a trailing dismiss (✕) button that calls this — a removable token. */
  onRemove?: () => void;
  /** Accessible name for the dismiss button (e.g. "Remove Stanford"). @default "Remove" */
  removeLabel?: string;
}

export function Tag({
  children,
  color = "blue",
  variant = "secondary",
  leading,
  onRemove,
  removeLabel,
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
      {onRemove ? (
        <button
          type="button"
          aria-label={removeLabel ?? "Remove"}
          onClick={onRemove}
          className="-mr-1 ml-0.5 inline-flex shrink-0 items-center justify-center rounded-full p-0.5 leading-none transition-colors hover:bg-black/10"
        >
          <X className="h-3 w-3" strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
