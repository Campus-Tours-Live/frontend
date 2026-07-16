import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PageContainer — the shared outer wrapper for an app page's content. Owns the two
 * things that otherwise drift per page: the max content width and the vertical
 * rhythm between top-level sections (`space-y-8`). Pair with `PageHeader`.
 *
 *  - `width="prose"` (default) caps the column at 960px — the readable width for
 *    text- and form-dense pages (Availability, Profile, …).
 *  - `width="wide"` fills the app shell's content column — for card/grid pages that
 *    want the room (Tour offerings, …).
 */
export type PageWidth = "prose" | "wide";

const WIDTH_CLASS: Record<PageWidth, string> = {
  prose: "mx-auto max-w-[960px]",
  wide: "",
};

export interface PageContainerProps {
  width?: PageWidth;
  className?: string;
  children: ReactNode;
}

export function PageContainer({ width = "prose", className, children }: PageContainerProps) {
  return <div className={cn("space-y-8", WIDTH_CLASS[width], className)}>{children}</div>;
}
