import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * CardMedia — full-bleed media (usually an `<img>`) at the top of a {@link Card}. No padding; the
 * child image is forced to `block` + full width. Put `overflow-hidden` on the Card so the media
 * respects its rounded corners.
 *
 *   <Card padded={false} className="overflow-hidden">
 *     <CardMedia><img alt="…" src="…" /></CardMedia>
 *     …
 *   </Card>
 */
export type CardMediaProps = HTMLAttributes<HTMLDivElement>;

export function CardMedia({ className, ...rest }: CardMediaProps) {
  return (
    <div className={cn("[&>img]:block [&>img]:w-full [&>img]:object-cover", className)} {...rest} />
  );
}
