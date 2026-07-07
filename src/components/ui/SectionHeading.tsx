import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * SectionHeading — the recurring eyebrow + title (+ lead) block used across
 * pages and sections. `level` controls the heading tag + size (maps to the
 * `.h1`–`.h4` design-system classes). All optional except `title`.
 */
type Level = 1 | 2 | 3 | 4;
/** Title size tokens: the numeric heading levels, plus `subhead` (24px, filling the h2↔h3 gap). */
type TitleSize = Level | "subhead";

const SIZE_CLASS: Record<TitleSize, string> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  subhead: "subhead",
};

export interface SectionHeadingProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  level?: Level;
  /** Visual size of the title, decoupled from the `level` tag — e.g. an `<h1>`
   *  (`level={1}`) rendered at `.h2` size (`titleSize={2}`) or `.subhead` size
   *  (24px, `titleSize="subhead"`). Defaults to `level`. */
  titleSize?: TitleSize;
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
  titleSize,
  align = "left",
  className,
  titleId,
}: SectionHeadingProps) {
  const Tag = `h${level}` as `h${Level}`;
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
      <Tag id={titleId} className={cn("mt-3", SIZE_CLASS[titleSize ?? level])}>
        {title}
      </Tag>
      {lead ? <p className={cn("lead mt-2", align === "center" && "mx-auto")}>{lead}</p> : null}
    </div>
  );
}
