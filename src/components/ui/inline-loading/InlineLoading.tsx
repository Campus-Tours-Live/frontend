import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "../spinner/Spinner";

/**
 * InlineLoading — the shared page-level "loading" row: a small spinner beside a
 * label (e.g. "Loading availability…"). Standardises the shape every page used to
 * hand-roll. `role="status"` so assistive tech announces the loading state.
 */
export interface InlineLoadingProps {
  label: ReactNode;
  className?: string;
}

export function InlineLoading({ label, className }: InlineLoadingProps) {
  return (
    <div role="status" className={cn("flex items-center gap-2 text-ink-soft", className)}>
      <Spinner />
      {label}
    </div>
  );
}
