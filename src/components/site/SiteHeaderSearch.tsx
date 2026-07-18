"use client";

import type { RefObject } from "react";
import { Search } from "lucide-react";
import { Button, Drawer } from "@/components/ui";
import type { HeaderSearch } from "./useHeaderSearch";

/**
 * Presentational pieces of the global, Airbnb-style segmented search (University · Topic ·
 * Language). All of them are driven by a single `useHeaderSearch()` instance passed down from
 * `SiteHeader`, so the row-1 pill and the row-2 band act as one control. The Language segment
 * is disabled in Phase 1 (badged "Soon") until the backend can filter by language.
 *
 *  - `HeaderSearchBar`    — the expanded desktop form (row 2 band), incl. the University
 *                           suggestions dropdown (recent + typeahead).
 *  - `HeaderSearchPill`   — the compact desktop pill (row 1), shown only while collapsed;
 *                           clicking it re-expands the band to edit.
 *  - `HeaderSearchMobile` — the always-compact mobile pill (row 1) that opens the full-screen
 *                           search sheet, plus the sheet itself.
 */
interface SearchProps {
  search: HeaderSearch;
}

/** HeaderSearchPill — compact "summary — search icon" button that reopens the band to edit. */
export function HeaderSearchPill({ search }: SearchProps) {
  return (
    <button
      type="button"
      onClick={search.openEditor}
      aria-label="Edit search"
      className="search flex min-w-0 max-w-sm flex-1 items-center justify-between text-left"
    >
      <span className="truncate text-ink-soft">{search.summary}</span>
      <Search size={18} strokeWidth={2} aria-hidden />
    </button>
  );
}

/** HeaderSearchBar — the expanded segmented desktop form: University (+ suggestions), Topic, Language. */
export function HeaderSearchBar({
  search,
  universityInputRef,
}: SearchProps & { universityInputRef: RefObject<HTMLInputElement | null> }) {
  const {
    q,
    setQ,
    topic,
    setTopic,
    uniFocused,
    setUniFocused,
    suggestions,
    topicOptions,
    submit,
    onSearchFocusCapture,
    onSearchBlurCapture,
  } = search;

  const suggestionsOpen = uniFocused && suggestions.length > 0;

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onFocusCapture={onSearchFocusCapture}
      onBlurCapture={onSearchBlurCapture}
      className="search flex w-full min-w-0 max-w-2xl items-stretch gap-0 p-1"
    >
      <div className="relative flex min-w-0 flex-1 flex-col">
        <label className="flex min-w-0 flex-col px-3 py-1">
          <span className="text-[11px] font-bold text-ink">University</span>
          <input
            ref={universityInputRef}
            type="text"
            role="combobox"
            aria-label="University"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen}
            aria-controls="header-university-suggestions"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setUniFocused(true)}
            onBlur={() => setTimeout(() => setUniFocused(false), 120)}
            placeholder="Search a school"
            className="min-w-0 bg-transparent text-ui-sm outline-none placeholder:text-ink-soft"
          />
        </label>
        {suggestionsOpen ? (
          <ul
            id="header-university-suggestions"
            role="listbox"
            aria-label="University suggestions"
            className="absolute left-0 top-full z-20 mt-2 max-h-72 w-72 overflow-auto rounded-card border border-border bg-card p-2 shadow-lg"
          >
            {q.trim().length < 1 ? (
              <li className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-soft">
                Recent searches
              </li>
            ) : null}
            {suggestions.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  role="option"
                  aria-selected={q === name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQ(name);
                    setUniFocused(false);
                  }}
                  className="w-full rounded-field px-2 py-2 text-left text-ui-sm hover:bg-muted"
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <span className="my-2 w-px shrink-0 bg-border" aria-hidden />

      <label className="flex min-w-0 flex-col px-3 py-1">
        <span className="text-[11px] font-bold text-ink">Topic</span>
        <select
          aria-label="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="min-w-0 bg-transparent text-ui-sm outline-none"
        >
          <option value="">Any topic</option>
          {topicOptions.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <span className="my-2 w-px shrink-0 bg-border" aria-hidden />

      <span
        className="flex flex-col px-3 py-1 opacity-50"
        title="Coming soon"
        aria-disabled="true"
        aria-label="Language — coming soon"
      >
        <span className="text-[11px] font-bold text-ink">Language</span>
        <span className="inline-flex items-center gap-1.5 text-ui-sm text-ink-soft">
          Any language
          <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em]">
            Soon
          </span>
        </span>
      </span>

      <button
        type="submit"
        aria-label="Search"
        className="ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-primary text-primary-foreground"
      >
        <Search size={18} strokeWidth={2} aria-hidden />
      </button>
    </form>
  );
}

/** HeaderSearchMobile — full-width pill that opens the full-screen search sheet, plus the sheet. */
export function HeaderSearchMobile({ search }: SearchProps) {
  const { q, setQ, topic, setTopic, topicOptions, summary, sheetOpen, setSheetOpen, submit } =
    search;

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="search flex min-w-0 flex-1 items-center gap-2 text-left lg:hidden"
      >
        <Search size={18} strokeWidth={2} aria-hidden />
        <span className="truncate text-ink-soft">{summary}</span>
      </button>

      <Drawer
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        side="bottom"
        title="Search tours"
        footer={
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="small"
              onClick={() => {
                setQ("");
                setTopic("");
              }}
            >
              Clear all
            </Button>
            <Button variant="primary" size="small" onClick={submit}>
              Search
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-ui-sm font-bold text-ink">University</span>
            <input
              type="text"
              aria-label="University"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a school"
              className="w-full rounded-field border border-input bg-white px-3 py-2 text-ui-sm outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-ui-sm font-bold text-ink">Topic</span>
            <select
              aria-label="Topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-field border border-input bg-white px-3 py-2 text-ui-sm outline-none"
            >
              <option value="">Any topic</option>
              {topicOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <div
            className="flex items-center justify-between opacity-50"
            aria-disabled="true"
            aria-label="Language — coming soon"
          >
            <span className="text-ui-sm font-bold text-ink">Language</span>
            <span className="inline-flex items-center gap-1.5 text-ui-sm text-ink-soft">
              Any language
              <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase">
                Soon
              </span>
            </span>
          </div>
        </div>
      </Drawer>
    </>
  );
}
