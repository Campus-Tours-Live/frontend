import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Heading } from "./Heading";
import { useCardSize, type CardSize } from "./CardSizeContext";

/**
 * CardHeader — a {@link Card}'s title row: an optional `leadingIcon`, the required `title` (rendered
 * as a {@link Heading}), and optional `trailing` content (e.g. a button). Padding follows the Card's
 * `size`.
 */
export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  leadingIcon?: ReactNode;
  title: ReactNode;
  trailing?: ReactNode;
}

const PAD: Record<CardSize, string> = {
  small: "px-5 pt-4 pb-2",
  large: "px-6 pt-6 pb-3",
};

export function CardHeader({ leadingIcon, title, trailing, className, ...rest }: CardHeaderProps) {
  const size = useCardSize();
  return (
    <div className={cn("flex items-center gap-3", PAD[size], className)} {...rest}>
      {leadingIcon != null ? (
        <span className="flex shrink-0 items-center text-ink-soft">{leadingIcon}</span>
      ) : null}
      <Heading as="h3" size={size === "large" ? "large" : "medium"} className="min-w-0 flex-1">
        {title}
      </Heading>
      {trailing != null ? <span className="flex shrink-0 items-center">{trailing}</span> : null}
    </div>
  );
}
