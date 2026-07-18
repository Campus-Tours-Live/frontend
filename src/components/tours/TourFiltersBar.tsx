"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button, Chip } from "@/components/ui";
import { useTourTopics } from "@/lib/data-access";

/**
 * TourFiltersBar — the Airbnb-style row under the header on /tours: a Filters button plus horizontal
 * topic quick-chips. Chips apply the topic instantly; the button opens the Filters modal.
 */
export function TourFiltersBar({
  topic,
  onTopicChange,
  onOpenFilters,
}: {
  topic: string;
  onTopicChange: (v: string) => void;
  onOpenFilters: () => void;
}) {
  const { data: topics } = useTourTopics();
  const options = topics ?? [];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <Button
        variant="secondary"
        size="small"
        onClick={onOpenFilters}
        className="inline-flex shrink-0 items-center gap-1.5"
      >
        <SlidersHorizontal size={15} strokeWidth={2} aria-hidden />
        Filters
      </Button>
      <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
      <Chip active={!topic} onClick={() => onTopicChange("")} className="shrink-0">
        Any
      </Chip>
      {options.map((t) => (
        <Chip
          key={t.value}
          active={topic === t.value}
          onClick={() => onTopicChange(t.value)}
          className="shrink-0"
        >
          {t.label}
        </Chip>
      ))}
    </div>
  );
}
