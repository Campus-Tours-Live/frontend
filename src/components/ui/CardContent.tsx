import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useCardSize, type CardSize } from "./CardSizeContext";

/**
 * CardContent — the padded body of a {@link Card}. Padding follows the Card's `size`.
 */
export type CardContentProps = HTMLAttributes<HTMLDivElement>;

const PAD: Record<CardSize, string> = {
  small: "px-5 py-4",
  large: "px-6 py-5",
};

export function CardContent({ className, ...rest }: CardContentProps) {
  const size = useCardSize();
  return <div className={cn(PAD[size], className)} {...rest} />;
}
