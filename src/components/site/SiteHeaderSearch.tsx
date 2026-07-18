"use client";

import type { RefObject, TransitionEvent as ReactTransitionEvent } from "react";
import { Search } from "lucide-react";
import { Button, Drawer } from "@/components/ui";
import type { HeaderSearch } from "./useHeaderSearch";

interface SearchProps {
  search: HeaderSearch;
}

/** The circular primary search action — same colour/icon/radius token in both layers, sharing the
 *  same right-edge centre so it reads as one continuous anchor (size differs by state). */
const ACTION_BASE =
  "grid shrink-0 place-items-center rounded-pill bg-primary text-primary-foreground";
const DIVIDER = "my-2 w-px shrink-0 self-stretch bg-border";

/**
 * DesktopSearchShell — the single white search shell (see globals `.ds-shell`). ONE DOM node whose
 * geometry (top/width/height) morphs between expanded and compact; the expanded form and the
 * compact "Edit search" button cross-fade INSIDE it. Exactly one layer is interactive at a time
 * (`inert` + `aria-hidden` keyed on `collapsed`); the two circular actions occupy the same right-edge
 * slot so the anchor travels continuously. Desktop only — the mobile control is separate.
 */
export function DesktopSearchShell({
  search,
  universityInputRef,
  onTransitionEnd,
}: SearchProps & {
  universityInputRef: RefObject<HTMLInputElement | null>;
  onTransitionEnd?: (e: ReactTransitionEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className="ds-shell overflow-visible rounded-pill border border-border bg-card shadow-lg"
      data-collapsed={search.collapsed}
      onTransitionEnd={onTransitionEnd}
    >
      <ExpandedContent search={search} universityInputRef={universityInputRef} />
      <CompactContent search={search} />
    </div>
  );
}

/** Expanded layer — the segmented form (University + suggestions · Topic · Language · submit). */
function ExpandedContent({
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
    collapsed,
    onSearchFocusCapture,
    onSearchBlurCapture,
  } = search;

  const suggestionsOpen = uniFocused && suggestions.length > 0;

  return (
    <form
      role="search"
      className="ds-expanded flex items-center px-1"
      inert={collapsed}
      aria-hidden={collapsed}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onFocusCapture={onSearchFocusCapture}
      onBlurCapture={onSearchBlurCapture}
    >
      <div className="flex min-w-0 flex-1 items-stretch">
        <div className="ds-seg--uni relative flex flex-col justify-center px-3">
          <span className="text-[11px] font-bold leading-tight text-ink">University</span>
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
            onBlur={() => setUniFocused(false)}
            placeholder="Search a school"
            className="min-w-0 bg-transparent text-ui-sm leading-tight outline-none placeholder:text-ink-soft"
          />
          {suggestionsOpen ? (
            <ul
              id="header-university-suggestions"
              role="listbox"
              aria-label="University suggestions"
              className="absolute left-0 top-full z-20 mt-3 max-h-72 w-72 overflow-auto rounded-card border border-border bg-card p-2 shadow-lg"
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

        <span className={DIVIDER} aria-hidden />

        <label className="ds-seg--topic flex flex-col justify-center px-3">
          <span className="text-[11px] font-bold leading-tight text-ink">Topic</span>
          <select
            aria-label="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="min-w-0 bg-transparent text-ui-sm leading-tight outline-none"
          >
            <option value="">Any topic</option>
            {topicOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <span className={DIVIDER} aria-hidden />

        <span
          className="ds-seg--lang flex flex-col justify-center px-3 opacity-50"
          title="Coming soon"
          aria-disabled="true"
          aria-label="Language — coming soon"
        >
          <span className="text-[11px] font-bold leading-tight text-ink">Language</span>
          <span className="inline-flex items-center gap-1.5 truncate text-ui-sm leading-tight text-ink-soft">
            Any language
            <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em]">
              Soon
            </span>
          </span>
        </span>
      </div>

      <button
        type="submit"
        aria-label="Search"
        className={`${ACTION_BASE} ml-1 h-10 w-10 self-center`}
      >
        <Search size={18} strokeWidth={2} aria-hidden />
      </button>
    </form>
  );
}

/** Compact layer — the whole thing is one "Edit search" button, but keeps the 3-segment structure
 *  (values only, no labels) aligned to the expanded grid so fields don't collapse into one summary.
 *  The inner segments and circle are decorative; only the shell is interactive. */
function CompactContent({ search }: SearchProps) {
  const { universityValue, topicValue, openEditor, collapsed } = search;
  return (
    <button
      type="button"
      className="ds-compact flex items-center px-1 text-left"
      aria-label="Edit search"
      inert={!collapsed}
      aria-hidden={!collapsed}
      onClick={openEditor}
    >
      <span className="flex min-w-0 flex-1 items-stretch">
        <span className="ds-seg--uni flex flex-col justify-center px-3">
          <span
            className={`truncate text-ui-sm font-semibold leading-tight ${
              universityValue ? "text-ink" : "text-ink-soft"
            }`}
          >
            {universityValue || "Choose university"}
          </span>
        </span>

        <span className={DIVIDER} aria-hidden />

        <span className="ds-seg--topic flex flex-col justify-center px-3">
          <span
            className={`truncate text-ui-sm leading-tight ${topicValue ? "text-ink" : "text-ink-soft"}`}
          >
            {topicValue || "Any topic"}
          </span>
        </span>

        <span className={DIVIDER} aria-hidden />

        <span className="ds-seg--lang flex flex-col justify-center px-3 opacity-60">
          <span className="inline-flex items-center gap-1 truncate text-ui-sm leading-tight text-ink-soft">
            Any language
            <span className="rounded-pill bg-muted px-1 py-0.5 text-[8px] font-bold uppercase">
              Soon
            </span>
          </span>
        </span>
      </span>

      <span aria-hidden className={`${ACTION_BASE} ml-1 h-[34px] w-[34px] self-center`}>
        <Search size={17} strokeWidth={2} aria-hidden />
      </span>
    </button>
  );
}

/** HeaderSearchMobile — full-width pill that opens the full-screen search sheet, plus the sheet.
 *  Kept as-is for now; a dedicated mobile visual is Step 3. */
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
