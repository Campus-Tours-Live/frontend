"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { Body, Caption, Icon } from "@/components/ui";
import { useUniversitySearch } from "@/lib/data-access";

export interface UniversityOption {
  id: string;
  name: string;
  shortName?: string | null;
  city?: string | null;
  region?: string | null;
}

/**
 * Debounced typeahead university picker backed by the search hook (catalog or live
 * Scorecard, via `source`). At `max={1}` it renders as a single-select combobox: the
 * chosen school shows in a bordered value row with a check and a "change" control.
 * At `max>1` it's a multi-select, ordered by what the user does: the search input and a live
 * "N of max selected" count sit on top, and the schools they've picked list below it (each row a
 * name + location + remove control), capped at `max`.
 */
export function UniversityMultiSelect({
  value,
  onChange,
  max = 5,
  source = "catalog",
  id,
  onFocus,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
}: {
  value: UniversityOption[];
  onChange: (next: UniversityOption[]) => void;
  max?: number;
  /** "catalog" = local table (default); "live" = every U.S. school via the Scorecard proxy. */
  source?: "catalog" | "live";
  /** Called when the search input gains focus (e.g. to clear a "required" error). */
  onFocus?: () => void;
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
  // After clearing the single selection via ✕, drop the cursor straight into the search input
  // (which only just re-mounted) so the user can retype without a second click. A ref flag — not
  // state — so resetting it in the effect doesn't trigger an extra render.
  const inputRef = useRef<HTMLInputElement>(null);
  const focusOnClearRef = useRef(false);
  useEffect(() => {
    if (!focusOnClearRef.current) return;
    focusOnClearRef.current = false;
    inputRef.current?.focus();
  }, [value.length]);

  const atMax = value.length >= max;
  const selectedIds = new Set(value.map((v) => v.id));
  // Single-select (max=1): once a school is chosen, show it as a combobox value row
  // instead of a removable chip + "maximum" caption.
  const single = max === 1;
  const selectedSingle = single && value.length === 1 ? value[0] : null;

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
      {selectedSingle ? (
        <div className="flex min-h-12 items-center gap-2.5 rounded-field border-[1.5px] border-border bg-white px-3">
          <span
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success text-white"
            aria-hidden="true"
          >
            <Check size={12} strokeWidth={3} />
          </span>
          <span className="flex-1 truncate text-[14.5px] font-semibold text-ink">
            {selectedSingle.name}
          </span>
          <button
            type="button"
            onClick={() => {
              focusOnClearRef.current = true;
              remove(selectedSingle.id);
            }}
            aria-label={`Change university, currently ${selectedSingle.name}`}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-field text-ink-soft transition-colors hover:bg-primary-soft hover:text-ink"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          {/* Search first — adding is the primary action on this step, so the input leads. */}
          {!atMax && (
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              >
                <Icon name="search" size={18} />
              </span>
              <input
                ref={inputRef}
                id={id}
                aria-describedby={ariaDescribedby}
                aria-invalid={ariaInvalid}
                className="input pl-10"
                placeholder="Search universities…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocusCapture={() => {
                  setOpen(true);
                  onFocus?.();
                }}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
              />
              {open && (loading || results.some((r) => !selectedIds.has(r.id))) && (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-card border border-border bg-card shadow-card">
                  {loading && (
                    <Caption as="li" className="px-4 py-2">
                      Searching…
                    </Caption>
                  )}
                  {results
                    .filter((r) => !selectedIds.has(r.id))
                    .map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
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

          {/* Live count doubles as the cap indicator — more feedback than a static "Pick up to N". */}
          {!single && (
            <Caption as="p" className="mt-1.5">
              {value.length} of {max} selected
              {atMax ? " · Remove one to add another" : ""}
            </Caption>
          )}

          {/* Selected schools as a light list (name over location) rather than heavy solid chips:
              long names get room, the location adds a second line, and the ✕ is an easy target.
              Very-light-blue fill via the theme's primary-soft token (not a one-off colour). */}
          {!single && value.length > 0 && (
            <ul className="mt-3 divide-y divide-border overflow-y-auto rounded-card border border-border bg-primary-soft/50">
              {value.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <Body as="p" size="small" weight={600} className="truncate text-primary-dark">
                      {v.name}
                    </Body>
                    {(v.city || v.region) && (
                      <Caption className="block truncate">
                        {[v.city, v.region].filter(Boolean).join(", ")}
                      </Caption>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(v.id)}
                    aria-label={`Remove ${v.name}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-field text-ink-soft transition-colors hover:bg-error-soft hover:text-error-foreground"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
