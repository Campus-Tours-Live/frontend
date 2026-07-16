import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Divider } from "../divider/Divider";
import { useCardSize, type CardSize } from "./CardSizeContext";

/**
 * CardActions — a {@link Card}'s footer: a full-bleed separator above a padded row of actions
 * (typically a ButtonGroup). Padding follows the Card's `size`.
 */
export type CardActionsProps = HTMLAttributes<HTMLDivElement>;

const PAD: Record<CardSize, string> = {
  small: "px-5 py-3",
  large: "px-6 py-4",
};

export function CardActions({ className, children, ...rest }: CardActionsProps) {
  const size = useCardSize();
  return (
    <div className={className} {...rest}>
      <Divider />
      <div className={PAD[size]}>{children}</div>
    </div>
  );
}
