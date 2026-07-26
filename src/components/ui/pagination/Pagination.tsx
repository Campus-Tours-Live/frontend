"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  /** Zero-based index of the current page. */
  page: number;
  /** Total number of pages. Renders nothing when `<= 1`. */
  totalPages: number;
  /** Called with the new zero-based page index. */
  onPageChange: (page: number) => void;
  /** Maximum numbered buttons shown in the middle window. @default 5 */
  windowSize?: number;
  /** Show the trailing "… N" last-page hint when the window doesn't reach the end. @default true */
  showLastPage?: boolean;
  className?: string;
}

const ARROW =
  "grid h-10 w-10 shrink-0 place-items-center rounded-pill border border-border bg-card text-ink-soft " +
  "transition-colors enabled:cursor-pointer enabled:hover:bg-primary-soft enabled:hover:text-primary " +
  "disabled:cursor-not-allowed disabled:opacity-40 " +
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-soft";
const NUMBER =
  "grid h-10 min-w-10 shrink-0 place-items-center rounded-pill border border-border bg-card px-3 text-[14px] " +
  "font-bold tabular-nums text-ink-soft transition-colors hover:bg-primary-soft hover:text-primary " +
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-soft";
const ACTIVE =
  "border-primary bg-primary text-primary-foreground hover:bg-primary-dark hover:text-primary-foreground";
// The trailing "… N" is context only, not a control: it shows the total page count without a
// bordered/hover surface so it reads as a plain label, not a clickable page.
const ELLIPSIS = "grid h-10 w-6 shrink-0 place-items-center text-ink-soft";
const LAST =
  "grid h-10 min-w-10 shrink-0 place-items-center px-3 text-[14px] font-bold tabular-nums text-ink-soft";

/**
 * Pagination — a numbered pager: ‹ chevron · a sliding window of up to `windowSize` page numbers · ›
 * chevron. The window centers on the current page (page 1 → 1…5; page 5 of 20 → 3…7; near the
 * end it pins to the last `windowSize`). When the window doesn't reach the end, a trailing "… N"
 * shows the last page as a NON-clickable label (context, not a jump target). Chevrons disable at the
 * first / last page. Page indices are zero-based to match the API; buttons display 1-based labels.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  windowSize = 5,
  showLastPage = true,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const current = page + 1; // 1-based for display
  const maxStart = Math.max(1, totalPages - windowSize + 1);
  // Center the window on the current page (clamped to [1, maxStart]) so earlier pages stay
  // reachable — a left-anchored window would hide every page before the current one.
  const start = Math.min(Math.max(current - Math.floor(windowSize / 2), 1), maxStart);
  const end = Math.min(start + windowSize - 1, totalPages);
  const numbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const hasPrev = current > 1;
  const hasNext = current < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1.5", className)}
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={!hasPrev}
        onClick={() => hasPrev && onPageChange(page - 1)}
        className={ARROW}
      >
        <ChevronLeft size={18} strokeWidth={2.2} aria-hidden />
      </button>

      {numbers.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Go to page ${n}`}
          aria-current={n === current ? "page" : undefined}
          onClick={() => onPageChange(n - 1)}
          className={cn(NUMBER, n === current && ACTIVE)}
        >
          {n}
        </button>
      ))}

      {showLastPage && end < totalPages ? (
        <>
          <span aria-hidden className={ELLIPSIS}>
            …
          </span>
          <span className={LAST} aria-label={`${totalPages} pages total`}>
            {totalPages}
          </span>
        </>
      ) : null}

      <button
        type="button"
        aria-label="Next page"
        disabled={!hasNext}
        onClick={() => hasNext && onPageChange(page + 1)}
        className={ARROW}
      >
        <ChevronRight size={18} strokeWidth={2.2} aria-hidden />
      </button>
    </nav>
  );
}
