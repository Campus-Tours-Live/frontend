import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./SectionHeading";

/**
 * PageHeader — the standard page title block: a level-1 `SectionHeading`
 * (title + optional lead) with an optional right-aligned `action` (e.g. a primary
 * CTA). When `action` is present it lays the two out in the shared responsive row
 * (stacked on mobile, title-left / action-right and baseline-aligned from `sm` up),
 * so every page's header behaves identically. Wrap the page in `PageContainer`.
 *
 * `level` controls the heading tag/size and defaults to `1` (page title). Eyebrows
 * are intentionally omitted here — the app nav already scopes the area.
 */
export interface PageHeaderProps {
  title: ReactNode;
  lead?: ReactNode;
  level?: 1 | 2 | 3 | 4;
  /** Optional right-aligned content (typically a primary action). */
  action?: ReactNode;
  /** id for the heading element (useful for aria-labelledby). */
  titleId?: string;
  className?: string;
}

export function PageHeader({
  title,
  lead,
  level = 1,
  action,
  titleId,
  className,
}: PageHeaderProps) {
  if (!action) {
    return (
      <SectionHeading
        title={title}
        lead={lead}
        level={level}
        titleId={titleId}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}
    >
      <SectionHeading title={title} lead={lead} level={level} titleId={titleId} />
      <div className="shrink-0">{action}</div>
    </div>
  );
}
