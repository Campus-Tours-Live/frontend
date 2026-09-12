"use client";

/** Searchable single- or multi-select university picker. */

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
  
  source?: "catalog" | "live";
  
  onFocus?: () => void;
  
  id?: string;
  
  "aria-labelledby"?: string;
  
  "aria-describedby"?: string;
  
  "aria-invalid"?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusOnClearRef = useRef(false);
  useEffect(() => {
    if (!focusOnClearRef.current) return;
    focusOnClearRef.current = false;
    inputRef.current?.focus();
  }, [value.length]);

  const atMax = value.length >= max;
  const selectedIds = new Set(value.map((v) => v.id));
  const single = max === 1;
  const selectedSingle = single && value.length === 1 ? value[0] : null;

  const { data: results = [], isFetching: loading } = useUniversitySearch(query, {
    enabled: !atMax,
    source,
  });

  const add = (o: UniversityOption) => 
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

          
          {!single && (
            <Caption as="p" className="mt-1.5">
              {value.length} of {max} selected
              {atMax ? " · Remove one to add another" : ""}
            </Caption>
          )}

          
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
