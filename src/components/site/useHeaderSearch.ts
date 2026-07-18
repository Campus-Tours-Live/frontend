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

  // Search EVERY U.S. school via the live College Scorecard directory (not just our seeded catalog).
  const { data: matches, isFetching } = useUniversitySearch(q, {
    enabled: q.trim().length >= 1,
    source: "live",
  });
  const queryHasText = q.trim().length >= 1;
  const suggestions = queryHasText ? (matches ?? []).map((m) => m.name) : readRecentUniversities();
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
  }, []);

  /** Cancel editing: end the interaction AND revert the draft to committed. This is the EXPLICIT undo
   *  (Escape only) — not the plain lose-focus path. */
  const cancelEditing = useCallback(() => {
    endInteraction();
    setQ(urlQ);
    setSelectedTopicIds(urlTopicIds);
  }, [endInteraction, urlQ, urlTopicIds]);

  /** Entering the University section by focusing its input (highlight + panel authority = section). */
  const onUniversityFocus = useCallback(() => {
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
    cancelEditing,
    endInteraction,
    onUniversityFocus,
    onSearchFocusCapture,
    onSearchBlurCapture,
  };
}

export type HeaderSearch = ReturnType<typeof useHeaderSearch>;
