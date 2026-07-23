"use client";

import { useState } from "react";
import { Button, Heading, Modal, SelectField } from "@/components/ui";
import type { TourCatalogSort } from "@/lib/data-access";

const SORTS: { value: TourCatalogSort; label: string }[] = [
  { value: "RECOMMENDED", label: "Recommended" },
  { value: "RATING", label: "Top rated" },
  { value: "PRICE_ASC", label: "Lowest price" },
  { value: "PRICE_DESC", label: "Highest price" },
];

/**
 * TourFiltersModal — the Airbnb-style Filters dialog for /tours. Phase 1 holds only Sort by (Topic
 * lives in the search + quick-chips, so it is intentionally excluded here). Edits are a draft;
 * "Show N tours" applies and closes, "Clear all" resets the draft to Recommended.
 */
export function TourFiltersModal({
  open,
  onClose,
  sort,
  resultCount,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  sort: TourCatalogSort;
  resultCount: number;
  onApply: (next: { sort: TourCatalogSort }) => void;
}) {
  const [draftSort, setDraftSort] = useState<TourCatalogSort>(sort);
  // Reseed the draft from `sort` whenever the modal transitions to open — computed during
  // render (not an effect) per React's "adjusting state" guidance, since this component stays
  // mounted across open/close (only Modal's own render is gated on `open`).
  // Diverges from the brief's `useEffect([open, sort])`: this reseeds only on an open transition
  // (spec: draft "seeded on open"), NOT on every `sort` change while the modal is open.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setDraftSort(sort);
  }

  const apply = () => {
    onApply({ sort: draftSort });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="tour-filters-title"
      header={
        <Heading as="h2" size="h4" id="tour-filters-title">
          Filters
        </Heading>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="small" onClick={() => setDraftSort("RECOMMENDED")}>
            Clear all
          </Button>
          <Button variant="primary" size="small" onClick={apply}>
            Show {resultCount} tours
          </Button>
        </div>
      }
    >
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
    </Modal>
  );
}
