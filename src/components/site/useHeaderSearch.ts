"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { canonicalizeTopicIds, useTourTopics, useUniversitySearch } from "@/lib/data-access";
import { pushRecentUniversity, readRecentUniversities } from "./recentUniversities";
import { useHeaderScrollState } from "./useHeaderScrollState";

/** Build a /tours URL from the search draft; `canonicalTopicIds` must already be canonical (see
 *  `canonicalizeTopicIds`) — this function never re-derives the empty/full-set rule. */
function buildToursHref(q: string, canonicalTopicIds: string[]): string {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  for (const id of canonicalTopicIds) params.append("topic", id);
  const qs = params.toString();
  return qs ? `/tours?${qs}` : "/tours";
}

/** Canonical topic summary: full-set/empty → "All topics" (never a count for that case), one topic
 *  → its label, otherwise "N topics". Both the draft and committed summaries route through this so
 *  the "All topics" rule lives in exactly one place. */
function summarizeTopics(canonicalIds: string[], topicOptions: TopicOption[]): string {
  if (canonicalIds.length === 0) return "All topics";
  if (canonicalIds.length === 1) {
    return topicOptions.find((t) => t.value === canonicalIds[0])?.label ?? "1 topic";
  }
  return `${canonicalIds.length} topics`;
}

export interface TopicOption {
  value: string;
  label: string;
}

/** The interactive header search sections. Language is "Soon" (non-interactive) so it is not one. */
export type HeaderSection = "university" | "topic" | null;

/**
 * useHeaderSearch — shared STATE for the global header search. DOM-free (refs live in SiteHeader).
 *
 * `activeSection` is the SINGLE authority for which section is highlighted and (with `panelVisible`)
 * which module panel is shown — focus is only a consequence, never the source of panel visibility.
 * `interactionLocked = activeSection !== null || searchFocusWithin || forceExpanded` keeps the header
 * expanded against scroll jitter; a fresh clear downward scroll overrides it (see the soft-lock
 * effect). `panelVisible` is revealed only once the shell has reached a usable expanded size
 * (SiteHeader gates it on the shell's transition), so a compact-click doesn't flash a panel at the
 * compact position.
 */
export function useHeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const onTours = pathname === "/tours";

  const { data: topics } = useTourTopics();
  const topicOptions: TopicOption[] = topics ?? [];
  const allTopicValues = topicOptions.map((t) => t.value);

  const urlQ = onTours ? (params.get("q") ?? "") : "";
  // Accept repeated `topic=` params AND comma lists, merged; split on comma, trim, drop empty,
  // dedupe (raw — canonicalisation for the "empty/full → []" rule happens where it's consumed).
  // Memoised so its identity is stable across renders (it's read in effect/callback deps below).
  const urlTopicIds = useMemo(
    () =>
      onTours
        ? Array.from(
            new Set(
              params
                .getAll("topic")
                .flatMap((s) => s.split(","))
                .map((s) => s.trim())
                .filter(Boolean),
            ),
          )
        : [],
    [onTours, params],
  );

  const [q, setQ] = useState(urlQ);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(urlTopicIds);
  const [searchFocusWithin, setSearchFocusWithin] = useState(false);
  const [forceExpanded, setForceExpanded] = useState(false);
  const [pendingFocus, setPendingFocus] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<HeaderSection>(null);
  // Whether the section module panel is actually shown (revealed after the shell has expanded).
  const [panelVisible, setPanelVisible] = useState(false);
  // Whether the user is actively TYPING a University query. Drives the live API independently of
  // panelVisible (which SiteHeader's transition/focus effects also touch) so a keystroke reliably
  // fetches. Set true on change; cleared on select / blur / commit / end. Focusing a pre-filled field
  // without editing, or having just picked a school, leaves it false → no external API call.
  const [uniQueryActive, setUniQueryActive] = useState(false);

  // Search EVERY U.S. school via the live College Scorecard directory (GET /v1/meta/universities).
  // Its labels are "Name — City, ST"; a pick commits the bare `school.name` (suffix stripped), which
  // matches the platform's university names — the catalog + guide-onboarding upserts both store the
  // same Scorecard `school.name`, so a name search resolves to that school's tours.
  const { data: matches, isFetching } = useUniversitySearch(q, {
    enabled: uniQueryActive && q.trim().length >= 1,
    source: "live",
  });
  const queryHasText = q.trim().length >= 1;
  const recentUniversities = readRecentUniversities();
  // Display labels (results carry the "— City, ST" suffix for disambiguation); recent history is bare.
  const suggestions: string[] = queryHasText
    ? (matches ?? []).map((m) => m.name)
    : recentUniversities;
  const universityLoading = queryHasText && isFetching;

  // Collapse UI is desktop-only; keep the scroll machinery off below the breakpoint.
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const { isCollapsed: scrollWantsCollapsed } = useHeaderScrollState({ enabled: desktop });

  const interactionLocked = activeSection !== null || searchFocusWithin || forceExpanded;
  const collapsed = scrollWantsCollapsed && !interactionLocked;

  // Any navigation cancels an in-flight edit intent (avoids a stray focus/expand on the next page).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setForceExpanded(false);
    setPendingFocus(false);
    setSearchFocusWithin(false);
    setActiveSection(null);
    setPanelVisible(false);
    setUniQueryActive(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname]);

  // SOFT LOCK: an active section / focus / forced-open keeps the header expanded against scroll
  // JITTER, but a FRESH clear downward scroll overrides it — it ends the interaction so the header may
  // collapse. Act only on the false→true TRANSITION of the scroll-collapse intent (a genuinely new
  // downward gesture), never on the standing state — else re-opening while already scrolled would be
  // cancelled instantly. Ending the interaction only CLOSES the panel/section — it does NOT revert the
  // draft (a picked university / typed query survives losing focus; only Escape explicitly reverts).
  const prevScrollWantsCollapsedRef = useRef(false);
  useEffect(() => {
    const wasWanting = prevScrollWantsCollapsedRef.current;
    prevScrollWantsCollapsedRef.current = scrollWantsCollapsed;
    if (wasWanting || !scrollWantsCollapsed) return;
    if (!(activeSection !== null || searchFocusWithin || forceExpanded)) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setForceExpanded(false);
    setSearchFocusWithin(false);
    setPendingFocus(false);
    setActiveSection(null);
    setPanelVisible(false);
    setUniQueryActive(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [scrollWantsCollapsed, activeSection, searchFocusWithin, forceExpanded]);

  /** Commit the current draft as the search (compact/expanded Search action). Preserves every other
   *  committed URL param (sort, and — for the future Nearby plan — geo/date): copy the current
   *  params and mutate only `q`/`topic`/`page`. Topics are written canonical (see
   *  `canonicalizeTopicIds`) as repeated `topic=` params, never comma-joined. */
  const commitSearch = useCallback(() => {
    pushRecentUniversity(q);
    const canonicalTopicIds = canonicalizeTopicIds(selectedTopicIds, allTopicValues);
    if (onTours) {
      const next = new URLSearchParams(params.toString());
      if (q.trim()) next.set("q", q.trim());
      else next.delete("q");
      next.delete("topic");
      for (const id of canonicalTopicIds) next.append("topic", id);
      next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `/tours?${qs}` : "/tours", { scroll: false });
    } else {
      router.push(buildToursHref(q, canonicalTopicIds));
    }
    setForceExpanded(false);
    setPendingFocus(false);
    setActiveSection(null);
    setPanelVisible(false);
    setUniQueryActive(false);
    setSheetOpen(false);
  }, [q, selectedTopicIds, allTopicValues, onTours, params, router]);

  /** Expand the header without choosing a section. */
  const ensureExpanded = useCallback(() => setForceExpanded(true), []);

  /** Open a section: seed the draft from committed, mark it active, request focus, and either reveal
   *  the panel now (already expanded) or leave it for SiteHeader to reveal once the shell expands
   *  (collapsed → expanding). Topic must NOT touch University focus/suggestions. */
  const openSection = useCallback(
    (section: NonNullable<HeaderSection>) => {
      setQ(urlQ);
      setSelectedTopicIds(urlTopicIds);
      setActiveSection(section);
      setPendingFocus(true);
      if (collapsed)
        setForceExpanded(true); // reveal happens on the shell's transition-end
      else setPanelVisible(true); // already expanded → reveal immediately
    },
    [urlQ, urlTopicIds, collapsed],
  );

  /** End the interaction: close the panel/section and drop the focus/expand locks, but KEEP the draft
   *  (a picked university / typed query / selected topics survive losing focus). Used by outside-click
   *  and the soft-lock scroll — losing focus must not wipe an unsubmitted selection. */
  const endInteraction = useCallback(() => {
    setForceExpanded(false);
    setPendingFocus(false);
    setSearchFocusWithin(false);
    setActiveSection(null);
    setPanelVisible(false);
    setUniQueryActive(false);
  }, []);

  /** Focusing the University input marks the section active. Focus is NOT editing, so the live query
   *  is not (re)enabled here — typing enables it. The popover only opens when the field is EMPTY (so we
   *  surface recent / nearby); merely focusing a pre-filled field must NOT pop the results panel or
   *  fire the API. */
  const onUniversityFocus = useCallback(() => {
    setActiveSection("university");
    setUniQueryActive(false);
    if (q.trim().length === 0) setPanelVisible(true);
  }, [q]);

  /** Typing in the University input: update the query, open the popover, and mark the typeahead active
   *  (so the live API fetches). */
  const onUniversityChange = useCallback((value: string) => {
    setQ(value);
    setActiveSection("university");
    setPanelVisible(true);
    setUniQueryActive(true);
  }, []);

  /** Choosing a University row: fill the field with the bare school name (strip the "— City, ST"
   *  display suffix so `q` matches the platform's stored Scorecard name) and CLOSE the popover. The
   *  value persists (not reverted). */
  const selectUniversity = useCallback((label: string) => {
    setQ(label.split(" — ")[0]);
    setActiveSection(null);
    setPanelVisible(false);
    setUniQueryActive(false);
  }, []);

  /** University input blur: keep the current content and just hide the popover. Rows preventDefault
   *  their mousedown so clicking a suggestion never routes through here (the click would otherwise be
   *  lost when the panel unmounts). Never reverts. */
  const onUniversityBlur = useCallback(() => {
    // Only hide the popover on blur; do NOT clear `uniQueryActive` here — a blur that races the
    // debounce settling must not cancel an in-flight fetch. Re-focus (onUniversityFocus) resets it,
    // which is what suppresses the API on a pre-filled / just-picked field.
    setPanelVisible(false);
    setActiveSection((prev) => (prev === "university" ? null : prev));
  }, []);

  /** Clear the University field via the inline ✕. Empties `q` WITHOUT enabling the live typeahead
   *  (an empty field must not fire the schools API); keeps the section focused and re-surfaces the
   *  recent / nearby panel, exactly like focusing an empty field. */
  const clearUniversity = useCallback(() => {
    setQ("");
    setUniQueryActive(false);
    setActiveSection("university");
    setPanelVisible(true);
  }, []);

  /** Enter a section while already expanded (e.g. clicking the expanded Topic segment). */
  const enterSection = useCallback((section: NonNullable<HeaderSection>) => {
    setActiveSection(section);
    setPanelVisible(true);
  }, []);

  /** Toggle a single topic in the Topic module's draft (multi-select — the panel stays open). */
  const toggleTopic = useCallback((id: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  /** "All topics" — clears the draft selection (canonical "no filter" is `[]`, not a per-id list). */
  const clearTopics = useCallback(() => setSelectedTopicIds([]), []);

  const onSearchFocusCapture = useCallback(() => setSearchFocusWithin(true), []);
  const onSearchBlurCapture = useCallback((e: React.FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSearchFocusWithin(false);
  }, []);

  // Draft summary (what the expanded Topic segment shows while editing).
  const canonicalDraftTopicIds = canonicalizeTopicIds(selectedTopicIds, allTopicValues);
  const topicSummary = summarizeTopics(canonicalDraftTopicIds, topicOptions);

  // Committed summary (what the compact segment / mobile summary show) — same canonical rule,
  // computed from the URL rather than the in-progress draft.
  const canonicalCommittedTopicIds = canonicalizeTopicIds(urlTopicIds, allTopicValues);
  const committedTopicSummary = summarizeTopics(canonicalCommittedTopicIds, topicOptions);

  const summary =
    [urlQ.trim() || null, canonicalCommittedTopicIds.length > 0 ? committedTopicSummary : null]
      .filter(Boolean)
      .join(" · ") || "Search tours";
  // Committed values for the compact 3-segment display (empty → the segment shows its placeholder).
  const universityValue = urlQ.trim();
  const topicValue = committedTopicSummary;

  return {
    universityValue,
    topicValue,
    q,
    setQ,
    selectedTopicIds,
    toggleTopic,
    clearTopics,
    topicSummary,
    searchFocusWithin,
    forceExpanded,
    setForceExpanded,
    pendingFocus,
    setPendingFocus,
    sheetOpen,
    setSheetOpen,
    suggestions,
    recentUniversities,
    uniQueryActive,
    queryHasText,
    universityLoading,
    topicOptions,
    onTours,
    summary,
    collapsed,
    activeSection,
    setActiveSection,
    panelVisible,
    setPanelVisible,
    commitSearch,
    ensureExpanded,
    openSection,
    enterSection,
    endInteraction,
    onUniversityFocus,
    onUniversityChange,
    selectUniversity,
    clearUniversity,
    onUniversityBlur,
    onSearchFocusCapture,
    onSearchBlurCapture,
  };
}

export type HeaderSearch = ReturnType<typeof useHeaderSearch>;
