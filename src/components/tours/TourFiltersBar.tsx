"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button, Chip } from "@/components/ui";
import { canonicalizeTopicIds, useTourTopics } from "@/lib/data-access";

/**
 * TourFiltersBar — the Airbnb-style row under the header on /tours: a Filters button plus horizontal
 * topic quick-chips (multi-select). Chips apply instantly; the button opens the Filters modal.
 */
export function TourFiltersBar({
  topicIds,
  onTopicsChange,
  onOpenFilters,
}: {
  topicIds: string[];
  onTopicsChange: (ids: string[]) => void;
  onOpenFilters: () => void;
}) {
  const { data: topics } = useTourTopics();
  const options = topics ?? [];
  const allValues = options.map((o) => o.value);
  const selected = new Set(topicIds);

  // Topic chips depend on client-fetched data the server can't render (the SSR HTML has only the
  // "Any" chip). If that fetch wins the race before this subtree hydrates, the client's first render
  // would have extra chips → hydration mismatch. Gate the topic chips on mount so the first client
  // render matches SSR; they appear a tick later once mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-mount flag
    setMounted(true);
  }, []);

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onTopicsChange(canonicalizeTopicIds([...next], allValues)); // canonical: full/none → []
  };

  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
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
      <Chip
        active={selected.size === 0}
        aria-pressed={selected.size === 0}
        onClick={() => onTopicsChange([])}
        className="shrink-0"
      >
        Any
      </Chip>
      {mounted
        ? options.map((t) => (
            <Chip
              key={t.value}
              active={selected.has(t.value)}
              aria-pressed={selected.has(t.value)}
              onClick={() => toggle(t.value)}
              className="shrink-0"
            >
              {t.label}
            </Chip>
          ))
        : null}
    </div>
  );
}
