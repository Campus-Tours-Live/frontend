"use client";

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type TransitionEvent as ReactTransitionEvent,
} from "react";
import { Check, Clock, GraduationCap, MapPin, Search, type LucideIcon } from "lucide-react";
import { Button, Drawer } from "@/components/ui";
import type { HeaderSearch } from "./useHeaderSearch";

interface SearchProps {
  search: HeaderSearch;
}

/** The circular primary search action — same colour/icon/radius token in both layers, sharing the
 *  same right-edge centre so it reads as one continuous anchor (size differs by state). */
const ACTION_BASE =
  "grid shrink-0 place-items-center rounded-pill bg-primary text-primary-foreground";
const DIVIDER = "ds-divider my-1 w-px shrink-0 self-stretch bg-border";

/**
 * DesktopSearchShell — the single white search shell (see globals `.ds-shell`). ONE DOM node whose
 * geometry (top/width/height) morphs between expanded and compact; the expanded form and the compact
 * section-button group cross-fade INSIDE it. Exactly one layer is interactive at a time (`inert` +
 * `aria-hidden` keyed on `collapsed`). Desktop only — the mobile control is separate.
 */
export function DesktopSearchShell({
  search,
  universityInputRef,
  topicRef,
  onTransitionEnd,
}: SearchProps & {
  universityInputRef: RefObject<HTMLInputElement | null>;
  topicRef: RefObject<HTMLButtonElement | null>;
  onTransitionEnd?: (e: ReactTransitionEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className="ds-shell overflow-visible rounded-pill border border-border bg-card"
      data-collapsed={search.collapsed}
      onTransitionEnd={onTransitionEnd}
    >
      <ExpandedContent
        search={search}
        universityInputRef={universityInputRef}
        topicRef={topicRef}
      />
      <CompactContent search={search} />
    </div>
  );
}

/** Expanded layer — the segmented form. Each interactive segment sets `activeSection` (which is what
 *  Commit B's shared panel will key off). Language is non-interactive ("Soon"). */
function ExpandedContent({
  search,
  universityInputRef,
  topicRef,
}: SearchProps & {
  universityInputRef: RefObject<HTMLInputElement | null>;
  topicRef: RefObject<HTMLButtonElement | null>;
}) {
  const {
    q,
    topicSummary,
    activeSection,
    panelVisible,
    enterSection,
    commitSearch,
    collapsed,
    onUniversityFocus,
    onUniversityChange,
    onUniversityBlur,
    onSearchFocusCapture,
    onSearchBlurCapture,
  } = search;

  return (
    <form
      role="search"
      className="ds-expanded flex items-center px-1"
      inert={collapsed}
      aria-hidden={collapsed}
      onSubmit={(e) => {
        e.preventDefault();
        commitSearch();
      }}
      onFocusCapture={onSearchFocusCapture}
      onBlurCapture={onSearchBlurCapture}
    >
      <div className="flex min-w-0 flex-1 items-stretch">
        <div
          className="ds-seg--uni flex flex-col justify-center self-stretch rounded-pill px-3 py-1.5 transition-colors hover:bg-muted data-[active=true]:bg-muted"
          data-active={activeSection === "university"}
        >
          <span className="text-[11px] font-bold leading-tight text-ink">University</span>
          <input
            ref={universityInputRef}
            type="text"
            role="combobox"
            aria-label="University"
            aria-autocomplete="list"
            aria-expanded={activeSection === "university" && panelVisible}
            aria-controls="header-university-panel"
            value={q}
            onChange={(e) => onUniversityChange(e.target.value)}
            onFocus={onUniversityFocus}
            onBlur={onUniversityBlur}
            placeholder="Search a school"
            className="min-w-0 bg-transparent text-ui-sm leading-tight outline-none placeholder:text-ink-soft"
          />
        </div>

        <span className={DIVIDER} aria-hidden />

        <button
          type="button"
          ref={topicRef}
          aria-label="Topic"
          aria-haspopup="listbox"
          aria-expanded={activeSection === "topic" && panelVisible}
          aria-controls="header-topic-panel"
          onClick={() => enterSection("topic")}
          className="ds-seg--topic flex flex-col justify-center self-stretch rounded-pill px-3 py-1.5 text-left transition-colors hover:bg-muted data-[active=true]:bg-muted"
          data-active={activeSection === "topic"}
        >
          <span className="text-[11px] font-bold leading-tight text-ink">Topic</span>
          <span
            className={`truncate text-ui-sm leading-tight ${topicSummary === "All topics" ? "text-ink-soft" : "text-ink"}`}
          >
            {topicSummary}
          </span>
        </button>

        <span className={DIVIDER} aria-hidden />

        <span
          className="ds-seg--lang flex flex-col justify-center px-3 opacity-50"
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

/** Compact layer — a GROUP (not one button): University and Topic are independent section buttons,
 *  Language is a non-interactive span, and the circular action opens the University section. Keeps
 *  the 3-segment structure aligned to the expanded grid. */
function CompactContent({ search }: SearchProps) {
  const { universityValue, topicValue, openSection, collapsed } = search;
  return (
    <div className="ds-compact flex items-center px-1" inert={!collapsed} aria-hidden={!collapsed}>
      <span className="flex min-w-0 flex-1 items-stretch">
        <button
          type="button"
          aria-label="University"
          onClick={() => openSection("university")}
          className="ds-seg--uni flex flex-col justify-center self-stretch rounded-pill px-3 py-1.5 text-left transition-colors hover:bg-muted"
        >
          <span
            className={`truncate text-ui-sm font-semibold leading-tight ${
              universityValue ? "text-ink" : "text-ink-soft"
            }`}
          >
            {universityValue || "Search university"}
          </span>
        </button>

        <span className={DIVIDER} aria-hidden />

        <button
          type="button"
          aria-label="Topic"
          onClick={() => openSection("topic")}
          className="ds-seg--topic flex flex-col justify-center self-stretch rounded-pill px-3 py-1.5 text-left transition-colors hover:bg-muted"
        >
          <span
            className={`truncate text-ui-sm leading-tight ${topicValue === "All topics" ? "text-ink-soft" : "text-ink"}`}
          >
            {topicValue}
          </span>
        </button>

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

      <button
        type="button"
        aria-label="Open search"
        onClick={() => openSection("university")}
        className={`${ACTION_BASE} ml-1 h-[34px] w-[34px] self-center`}
      >
        <Search size={17} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

/** One University suggestion / recent row. Explicit `role="option"` (header-v2 §6.0), and
 *  `onMouseDown` preventDefault so clicking it does NOT blur the input — otherwise the input's blur
 *  would hide the panel and unmount this row before the click lands. */
function UniversityOptionRow({
  name,
  active,
  onChoose,
}: {
  name: string;
  active: boolean;
  onChoose: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onChoose}
        className={`w-full rounded-field px-3 py-2 text-left text-ui-sm ${
          active ? "bg-primary-soft font-bold text-primary" : "hover:bg-muted"
        }`}
      >
        {name}
      </button>
    </li>
  );
}

/** UniversitySectionPanel — the shared University module. Its visibility is authored ONLY by
 *  `activeSection === "university"` + `panelVisible` (never by focus or suggestions length), so it is
 *  a STABLE container that switches content between recent / loading / results / empty-results. It's a
 *  header-layer sibling (see globals `.ds-panel`) so outside-click (headerRef.contains) covers it; the
 *  real scroll container carries `overscroll-behavior: contain` so panel scroll never chains to the
 *  page. Desktop only. */
export function UniversitySectionPanel({ search }: SearchProps) {
  const {
    activeSection,
    panelVisible,
    collapsed,
    q,
    setQ,
    selectUniversity,
    queryHasText,
    universityLoading,
    suggestions,
  } = search;
  if (collapsed || !panelVisible || activeSection !== "university") return null;

  return (
    <div
      id="header-university-panel"
      role="region"
      aria-label="University search"
      className="ds-panel hidden rounded-card border border-border bg-card shadow-lg lg:block"
    >
      <div className="ds-panel-scroll max-h-[min(60vh,420px)] overflow-y-auto p-2 [overscroll-behavior:contain]">
        {universityLoading ? (
          <p className="px-2 py-6 text-center text-ui-sm text-ink-soft">Searching…</p>
        ) : queryHasText ? (
          suggestions.length > 0 ? (
            <ul
              role="listbox"
              aria-label="University suggestions"
              className="flex flex-col gap-0.5"
            >
              {suggestions.map((name) => (
                <UniversityOptionRow
                  key={name}
                  name={name}
                  active={q === name}
                  onChoose={() => selectUniversity(name)}
                />
              ))}
            </ul>
          ) : (
            <p className="px-2 py-6 text-center text-ui-sm text-ink-soft">No schools found</p>
          )
        ) : (
          // Empty input → recent history (if any) plus a Nearby shortcut.
          <div className="flex flex-col gap-0.5">
            {suggestions.length > 0 ? (
              <>
                <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-soft">
                  Recent searches
                </p>
                <ul
                  role="listbox"
                  aria-label="University suggestions"
                  className="flex flex-col gap-0.5"
                >
                  {suggestions.map((name) => (
                    <UniversityOptionRow
                      key={name}
                      name={name}
                      active={q === name}
                      onChoose={() => selectUniversity(name)}
                    />
                  ))}
                </ul>
                <div className="my-1 h-px bg-border" aria-hidden />
              </>
            ) : null}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setQ("")}
              className="flex w-full items-center gap-2 rounded-field px-3 py-2 text-left text-ui-sm hover:bg-muted"
            >
              <MapPin size={16} strokeWidth={2} aria-hidden />
              Nearby — schools around you
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** TopicSectionPanel — the Topic module, a real multi-select listbox. Same header-sibling
 *  `.ds-panel` container as the University module, gated by `activeSection === "topic"` +
 *  `panelVisible`. Options come from the backend topic vocabulary (`useTourTopics`) — never
 *  hard-coded. Rows are explicit `<button type="button" role="option" aria-selected>` (NOT
 *  `MenuItem` — header-v2 §6.0 forbids mixing `role="menuitem"` semantics with `aria-selected`).
 *  "All topics" is a plain `<button>` OUTSIDE the listbox — it is not a `TourTopic`, so it must not
 *  masquerade as an option. Toggling a topic updates the draft and keeps the panel open (no
 *  auto-submit, no auto-close); the header-level keyboard contract lives here (ArrowUp/Down/
 *  Home/End move an active index with `aria-activedescendant`, Space/Enter toggles). Desktop only. */
export function TopicSectionPanel({ search }: SearchProps) {
  const {
    activeSection,
    panelVisible,
    collapsed,
    selectedTopicIds,
    topicOptions,
    toggleTopic,
    clearTopics,
    endInteraction,
  } = search;
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSection === "topic" && panelVisible) listRef.current?.focus();
  }, [activeSection, panelVisible]);

  // Clamp the active index if the vocab loads/changes; default to the first selected option.
  useEffect(() => {
    const firstSel = topicOptions.findIndex((t) => selectedTopicIds.includes(t.value));
    /* eslint-disable react-hooks/set-state-in-effect */
    setActiveIdx((i) => (i > topicOptions.length - 1 ? 0 : i < 0 ? Math.max(0, firstSel) : i));
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicOptions.length]);

  if (collapsed || !panelVisible || activeSection !== "topic") return null;

  const selected = new Set(selectedTopicIds);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = topicOptions.length - 1;
    if (last < 0) return; // empty options guard
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, last));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(last);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const opt = topicOptions[activeIdx];
      if (opt) toggleTopic(opt.value);
    }
    // Escape: handled by SiteHeader's document keydown listener (→ endInteraction, keeps content); not here.
  };

  const activeId = topicOptions[activeIdx]?.value;

  return (
    <div
      ref={panelRef}
      id="header-topic-panel"
      role="region"
      aria-label="Topic"
      // Focus moving OUT of the panel closes it (keeps the draft) — same as the University field.
      // Close whenever focus is not landing on a child of the panel: Tab-away, another header
      // control, OR clicking a blank part of the header (focus → body, a null relatedTarget). Clicking
      // an option does NOT fire this — the option buttons preventDefault their mousedown, so focus
      // stays on the listbox and no blur occurs.
      onBlur={(e) => {
        if (!panelRef.current?.contains(e.relatedTarget as Node | null)) endInteraction();
      }}
      className="ds-panel ds-panel--topic hidden rounded-card border border-border bg-card shadow-lg lg:block"
    >
      <p className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-soft">
        Topic · select all that apply
      </p>
      <div className="px-2 pb-1">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={clearTopics}
          className={`w-full rounded-field px-3 py-2 text-left text-ui-sm ${selected.size === 0 ? "bg-primary-soft font-bold text-primary" : "hover:bg-muted"}`}
        >
          All topics
        </button>
      </div>
      <ul
        ref={listRef}
        tabIndex={0}
        role="listbox"
        aria-multiselectable="true"
        aria-label="Topics"
        aria-activedescendant={activeId ? `topic-opt-${activeId}` : undefined}
        onKeyDown={onKeyDown}
        className="ds-panel-scroll flex max-h-[min(60vh,420px)] flex-col gap-0.5 overflow-y-auto px-2 pb-2 outline-none [overscroll-behavior:contain]"
      >
        {topicOptions.map((t, i) => (
          <li key={t.value}>
            <button
              type="button"
              id={`topic-opt-${t.value}`}
              role="option"
              aria-selected={selected.has(t.value)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setActiveIdx(i);
                toggleTopic(t.value);
              }}
              className={`flex w-full items-center justify-between rounded-field px-3 py-2 text-left text-ui-sm ${selected.has(t.value) ? "bg-primary-soft font-bold text-primary" : "hover:bg-muted"}`}
            >
              {t.label}
              {selected.has(t.value) ? <Check size={16} strokeWidth={2.5} aria-hidden /> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** HeaderSearchMobile — full-width pill that opens the full-screen search sheet, plus the sheet.
 *  Kept as-is for now; a dedicated mobile visual is a later step. */
/** A destination row in the mobile "Where?" card (a live match or a recent search). Shows the bare
 *  school name, with the city/state (from a live "Name — City, ST" label) as a secondary line. */
function MobileUniRow({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  const [name, place] = label.split(" — ");
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-field px-1 py-2 text-left hover:bg-muted"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-muted text-ink-soft">
        <Icon size={18} strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-ui-sm font-semibold text-ink">{name}</span>
        {place ? <span className="block truncate text-ui-sm text-ink-soft">{place}</span> : null}
      </span>
    </button>
  );
}

/** A collapsed accordion row (label left, current value right) — tap to expand that section. */
function MobileCollapsedRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-card border border-border bg-card px-5 py-4 text-left shadow-sm"
    >
      <span className="text-ui-sm font-semibold text-ink-soft">{label}</span>
      <span className="truncate pl-4 text-ui-sm font-semibold text-ink">{value}</span>
    </button>
  );
}

/** HeaderSearchMobile — the mobile control: a full-width pill that opens an Airbnb-style bottom-sheet
 *  accordion. Exactly one section (Where / Topic) is expanded as a white card; the other collapses to
 *  a summary row. Footer: Clear all + Search. Desktop uses the morphing shell instead (this is hidden
 *  at lg). */
export function HeaderSearchMobile({ search }: SearchProps) {
  const {
    q,
    onUniversityChange,
    selectUniversity,
    suggestions,
    recentUniversities,
    uniQueryActive,
    queryHasText,
    setQ,
    selectedTopicIds,
    toggleTopic,
    clearTopics,
    topicOptions,
    topicSummary,
    summary,
    sheetOpen,
    setSheetOpen,
    commitSearch,
  } = search;
  const [section, setSection] = useState<"university" | "topic">("university");

  // Picking a school just fills the field (no auto-advance to Topic — the user decides what's next).
  const pickUniversity = (label: string) => {
    selectUniversity(label);
  };

  const cardCls = "rounded-card border border-border bg-card p-5 shadow-sm";
  const titleCls = "mb-4 font-display text-h4 font-bold text-ink";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSection("university");
          setSheetOpen(true);
        }}
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
                clearTopics();
              }}
            >
              Clear all
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={commitSearch}
              className="inline-flex items-center gap-1.5"
            >
              <Search size={16} strokeWidth={2} aria-hidden />
              Search
            </Button>
          </div>
        }
      >
        {sheetOpen ? (
          <div className="flex flex-col gap-3">
            {/* Where / University */}
            {section === "university" ? (
              <section className={cardCls}>
                <h2 className={titleCls}>University</h2>
                <div className="flex items-center gap-2 rounded-pill border border-input px-4 py-3">
                  <Search size={18} strokeWidth={2} className="text-ink-soft" aria-hidden />
                  <input
                    type="text"
                    aria-label="University"
                    value={q}
                    onChange={(e) => onUniversityChange(e.target.value)}
                    placeholder="Search a school"
                    className="min-w-0 flex-1 bg-transparent text-ui-sm outline-none placeholder:text-ink-soft"
                  />
                </div>

                <div className="mt-4 flex flex-col gap-1">
                  {/* Only show live results (or "No schools found") while ACTIVELY typing — a
                      pre-filled field that hasn't been edited shows recent + Nearby, like desktop. */}
                  {uniQueryActive && queryHasText ? (
                    suggestions.length > 0 ? (
                      suggestions.map((label) => (
                        <MobileUniRow
                          key={label}
                          label={label}
                          icon={GraduationCap}
                          onClick={() => pickUniversity(label)}
                        />
                      ))
                    ) : (
                      <p className="px-1 py-3 text-ui-sm text-ink-soft">No schools found</p>
                    )
                  ) : (
                    <>
                      {recentUniversities.length > 0 ? (
                        <>
                          <p className="px-1 pb-1 pt-1 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-soft">
                            Recent searches
                          </p>
                          {recentUniversities.map((label) => (
                            <MobileUniRow
                              key={label}
                              label={label}
                              icon={Clock}
                              onClick={() => pickUniversity(label)}
                            />
                          ))}
                        </>
                      ) : null}
                      <p className="px-1 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-soft">
                        Suggested
                      </p>
                      <MobileUniRow
                        label="Nearby — Find what's around you"
                        icon={MapPin}
                        onClick={() => setQ("")}
                      />
                    </>
                  )}
                </div>
              </section>
            ) : (
              <MobileCollapsedRow
                label="University"
                value={q.trim() || "Add a school"}
                onClick={() => setSection("university")}
              />
            )}

            {/* Topic */}
            {section === "topic" ? (
              <section className={cardCls}>
                <h2 className={titleCls}>Topic</h2>
                <p className="-mt-2 mb-3 text-ui-sm text-ink-soft">Select all that apply.</p>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={clearTopics}
                    className={`rounded-field px-3 py-2.5 text-left text-ui-sm ${selectedTopicIds.length === 0 ? "bg-primary-soft font-bold text-primary" : "hover:bg-muted"}`}
                  >
                    All topics
                  </button>
                  {topicOptions.map((t) => {
                    const on = selectedTopicIds.includes(t.value);
                    return (
                      <button
                        key={t.value}
                        type="button"
                        role="option"
                        aria-selected={on}
                        onClick={() => toggleTopic(t.value)}
                        className={`flex items-center justify-between rounded-field px-3 py-2.5 text-left text-ui-sm ${on ? "bg-primary-soft font-bold text-primary" : "hover:bg-muted"}`}
                      >
                        {t.label}
                        {on ? <Check size={16} strokeWidth={2.5} aria-hidden /> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : (
              <MobileCollapsedRow
                label="Topic"
                value={topicSummary}
                onClick={() => setSection("topic")}
              />
            )}
          </div>
        ) : null}
      </Drawer>
    </>
  );
}
