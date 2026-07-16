import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * SectionHeading — the recurring eyebrow + title (+ lead) block used across
 * pages and sections. `level` controls the heading tag + size (maps to the
 * `.h1`–`.h4` design-system classes). All optional except `title`.
 */
type Level = 1 | 2 | 3 | 4;

const TITLE_CLASS: Record<Level, string> = { 1: "h1", 2: "h2", 3: "h3", 4: "h4" };

export interface SectionHeadingProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  level?: Level;
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
  align = "left",
  className,
  titleId,
}: SectionHeadingProps) {
  const Tag = `h${level}` as `h${Level}`;
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
      <Tag id={titleId} className={cn("mt-2", TITLE_CLASS[level])}>
        {title}
      </Tag>
      {lead ? <p className={cn("lead mt-3", align === "center" && "mx-auto")}>{lead}</p> : null}
    </div>
  );
}
