"use client";

import { useState } from "react";
import { Body, Caption, Tag } from "@/components/ui";
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
  source = "catalog",
  id,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
}: {
  value: UniversityOption[];
  onChange: (next: UniversityOption[]) => void;
  max?: number;
  /** "catalog" = local table (default); "live" = every U.S. school via the Scorecard proxy. */
  source?: "catalog" | "live";
  /** Id for the search input, so a wrapping `<label htmlFor>` associates + focuses it (present only
   *  while below `max`). */
  id?: string;
  /** Ids of the element(s) naming this control. When set, the always-present outer container becomes
   *  a labelled `role="group"`, so the field keeps an accessible name even at max (input unmounted). */
  "aria-labelledby"?: string;
  /** Ids of the element(s) describing this control (e.g. help text). Placed on the search input (so
   *  it's announced on focus, the common case) AND on the persistent group container (so it still
   *  survives at max, when the input has unmounted). */
  "aria-describedby"?: string;
  /** Marks the field invalid (e.g. a required selection is empty). Applied to the search input —
   *  which is always present in the error state, since an empty required selection is below `max`. */
  "aria-invalid"?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const atMax = value.length >= max;
  const selectedIds = new Set(value.map((v) => v.id));

  // Debounce, request cancellation, and caching all live in the hook now.
  const { data: results = [], isFetching: loading } = useUniversitySearch(query, {
    enabled: !atMax,
    source,
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
    <div
      // The container is only a named region when it has a label — keep its describedby paired with
      // the group role so a stray describedby never lands on a roleless div (the input carries its
      // own describedby below for the focus case).
      role={ariaLabelledby ? "group" : undefined}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaLabelledby ? ariaDescribedby : undefined}
    >
      {value.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {value.map((v) => (
            <Tag
              key={v.id}
              color="blue"
              variant="primary"
              onRemove={() => remove(v.id)}
              removeLabel={`Remove ${v.name}`}
              className="border-[1.5px] border-primary px-3.5 py-[7px] text-ui-sm"
            >
              {v.shortName || v.name}
            </Tag>
          ))}
        </div>
      )}

      {!atMax && (
        <div className="relative">
          <input
            id={id}
            aria-describedby={ariaDescribedby}
            aria-invalid={ariaInvalid}
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
