"use client";

import { useState } from "react";
import { Body, Caption } from "@/components/ui";
import { useUniversitySearch } from "@/lib/data-access";

export interface UniversityOption {
  id: string;
  name: string;
  shortName?: string | null;
  city?: string | null;
  region?: string | null;
}

/**
 * Debounced typeahead multi-select backed by GET /v1/universities.
 * Loads results from the DB catalog (not hardcoded); shows selected as removable
 * chips; caps the number of selections.
 */
export function UniversityMultiSelect({
  value,
  onChange,
  max = 5,
  id,
  "aria-labelledby": ariaLabelledby,
}: {
  value: UniversityOption[];
  onChange: (next: UniversityOption[]) => void;
  max?: number;
  /** Id for the search input, so a wrapping `<label htmlFor>` associates + focuses it (present only
   *  while below `max`). */
  id?: string;
  /** Ids of the element(s) naming this control. When set, the always-present outer container becomes
   *  a labelled `role="group"`, so the field keeps an accessible name even at max (input unmounted). */
  "aria-labelledby"?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const atMax = value.length >= max;
  const selectedIds = new Set(value.map((v) => v.id));

  // Debounce, request cancellation, and caching all live in the hook now.
  const { data: results = [], isFetching: loading } = useUniversitySearch(query, {
    enabled: !atMax,
  });

  const add = (o: UniversityOption) => {
    /* istanbul ignore next -- guard: the dropdown hides selected options and the input at max */
    if (atMax || selectedIds.has(o.id)) return;
    onChange([...value, o]);
    setQuery("");
    setOpen(false);
  };
  const remove = (id: string) => onChange(value.filter((v) => v.id !== id));

  return (
    <div role={ariaLabelledby ? "group" : undefined} aria-labelledby={ariaLabelledby}>
      {value.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {value.map((v) => (
            <span key={v.id} className="chip active">
              {v.shortName || v.name}
              <button
                type="button"
                aria-label={`Remove ${v.name}`}
                onClick={() => remove(v.id)}
                className="ml-1 leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {!atMax && (
        <div className="relative">
          <input
            id={id}
            className="input"
            placeholder="Search universities…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocusCapture={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {open && (loading || results.some((r) => !selectedIds.has(r.id))) && (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-card border border-border bg-card shadow-card">
              {loading && <li className="px-4 py-2 text-ui-sm text-ink-soft">Searching…</li>}
              {results
                .filter((r) => !selectedIds.has(r.id))
                .map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => add(r)}
                      className="flex w-full flex-col items-start px-4 py-2 text-left transition-colors hover:bg-primary-soft"
                    >
                      <Body as="span" size="medium">
                        {r.name}
                      </Body>
                      {(r.city || r.region) && (
                        <Caption>{[r.city, r.region].filter(Boolean).join(", ")}</Caption>
                      )}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      <Caption as="p" className="mt-1.5">
        {atMax ? `Maximum ${max} selected.` : `Pick up to ${max}.`}
      </Caption>
    </div>
  );
}
