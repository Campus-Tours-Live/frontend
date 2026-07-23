import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * SectionHeading — the recurring eyebrow + title (+ lead) block used across
 * pages and sections. `level` sets the semantic heading tag (h1–h4); `size`
 * overrides the visual scale (incl. the oversized `display` for heroes). Pass
 * `action` to place a control (a link/button/note) to the right of the title.
 * All optional except `title`.
 */
type Level = 1 | 2 | 3 | 4;
export type SectionHeadingSize = "display" | "h1" | "h2" | "h3" | "h4";

const LEVEL_SIZE: Record<Level, SectionHeadingSize> = { 1: "h1", 2: "h2", 3: "h3", 4: "h4" };

export interface SectionHeadingProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** Semantic heading tag. @default 2 */
  level?: Level;
  /** Visual scale — overrides the level-derived size (e.g. `display` for a hero). */
  size?: SectionHeadingSize;
  /** A control rendered to the right of the title (link/button/summary note). */
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
  /** id for the heading element (useful for aria-labelledby on dialogs). */
  titleId?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  level = 2,
  size,
  action,
  align = "left",
  className,
  titleId,
}: SectionHeadingProps) {
  const Tag = `h${level}` as `h${Level}`;
  // The size name IS the design-system class (.display / .h1–.h4).
  const titleClass = size ?? LEVEL_SIZE[level];
  const header = (
    <>
      {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
      <Tag id={titleId} className={cn("mt-2", titleClass)}>
        {title}
      </Tag>
    </>
  );
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      {action ? (
        <div className="flex items-end justify-between gap-5">
          <div>{header}</div>
          {action}
        </div>
      ) : (
        header
      )}
      {lead ? <p className={cn("lead mt-3", align === "center" && "mx-auto")}>{lead}</p> : null}
    </div>
  );
}
