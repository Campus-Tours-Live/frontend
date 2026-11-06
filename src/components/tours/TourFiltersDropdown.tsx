"use client";

import { useMemo, useState } from "react";
import { Button, Chip, Heading, Popover, SelectField } from "@/components/ui";
import {
  canonicalizeTopicIds,
  useTourCatalog,
  useTourTopics,
  type TourCatalogFilters,
  type TourCatalogSort,
} from "@/lib/data-access";

const SORTS: { value: TourCatalogSort; label: string }[] = [
  { value: "RECOMMENDED", label: "Recommended" },
  { value: "RATING", label: "Top rated" },
  { value: "PRICE_ASC", label: "Lowest price" },
  { value: "PRICE_DESC", label: "Highest price" },
];

/**
 * TourFiltersDropdown — anchored Filters dropdown for /tours. It mirrors the filters already
 * supported by GET /v1/tours: topic multi-select and sort order. Edits are a draft; "Show N tours"
 * applies and closes, "Clear all" resets the draft to Any topic + Recommended.
 */
export function TourFiltersDropdown({
  open,
  anchorEl,
  onClose,
  topicIds,
  sort,
  baseFilters = {},
  resultCount,
  onApply,
}: {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  topicIds: string[];
  sort: TourCatalogSort;
  baseFilters?: Pick<TourCatalogFilters, "q" | "universityId">;
  resultCount: number;
  onApply: (next: { topicIds: string[]; sort: TourCatalogSort }) => void;
}) {
  const { data: topics } = useTourTopics();
  const options = useMemo(() => topics ?? [], [topics]);
  const allValues = useMemo(() => options.map((o) => o.value), [options]);

  const [draftTopicIds, setDraftTopicIds] = useState<string[]>(topicIds);
  const [draftSort, setDraftSort] = useState<TourCatalogSort>(sort);
  const selected = new Set(draftTopicIds);
  const previewTopicIds = useMemo(
    () => canonicalizeTopicIds(draftTopicIds, allValues),
    [draftTopicIds, allValues],
  );
  const previewFilters = useMemo<TourCatalogFilters>(
    () => ({
      q: baseFilters.q,
      universityId: baseFilters.universityId,
      topicIds: previewTopicIds.length ? previewTopicIds : undefined,
      sort: draftSort,
      page: 0,
      // Count preview only needs the first item; the backend's totalElements carries the answer.
      limit: 1,
    }),
    [baseFilters.q, baseFilters.universityId, draftSort, previewTopicIds],
  );
  const preview = useTourCatalog(previewFilters, { enabled: open });
  const previewCount = preview.data?.totalElements ?? resultCount;

  // Reseed the draft from committed filters whenever the dropdown transitions to open. This
  // component stays mounted while Popover renders null, so a close/reopen discards abandoned edits.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDraftTopicIds(topicIds);
      setDraftSort(sort);
    }
  }

  const toggleTopic = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setDraftTopicIds(canonicalizeTopicIds([...next], allValues));
  };

  const clear = () => {
    setDraftTopicIds([]);
    setDraftSort("RECOMMENDED");
  };

  const apply = () => {
    onApply({ topicIds: canonicalizeTopicIds(draftTopicIds, allValues), sort: draftSort });
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      align="start"
      role="dialog"
      aria-label="Filters"
    >
      <div className="w-[min(calc(100vw-2rem),28rem)] overflow-hidden rounded-panel border border-border bg-card shadow-card">
        <div className="border-b border-border px-5 py-4">
          <Heading as="h2" size="h4">
            Filters
          </Heading>
        </div>

        <div className="max-h-[min(60vh,26rem)] overflow-y-auto px-5 py-5">
          <div className="space-y-7">
            <section aria-labelledby="tour-filter-topics-title">
              <Heading as="h3" size="small" id="tour-filter-topics-title">
                Tour topic
              </Heading>
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip active={selected.size === 0} onClick={() => setDraftTopicIds([])}>
                  Any topic
                </Chip>
                {options.map((topic) => (
                  <Chip
                    key={topic.value}
                    active={selected.has(topic.value)}
                    onClick={() => toggleTopic(topic.value)}
                  >
                    {topic.label}
                  </Chip>
                ))}
              </div>
            </section>

            <SelectField
              label="Sort by"
              value={draftSort}
              onChange={(e) => setDraftSort(e.target.value as TourCatalogSort)}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </SelectField>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          <Button variant="ghost" size="small" onClick={clear}>
            Clear all
          </Button>
          <Button variant="primary" size="small" onClick={apply}>
            Show {previewCount} tours
          </Button>
        </div>
      </div>
    </Popover>
  );
}
