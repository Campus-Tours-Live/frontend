"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTourTopics, useUniversitySearch } from "@/lib/data-access";
import { pushRecentUniversity, readRecentUniversities } from "./recentUniversities";
import { useHeaderScrollState } from "./useHeaderScrollState";

/** Build a /tours URL from the search draft; empty values are omitted. */
function buildToursHref(q: string, topic: string): string {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (topic) params.set("topic", topic);
  const qs = params.toString();
  return qs ? `/tours?${qs}` : "/tours";
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

  const urlQ = onTours ? (params.get("q") ?? "") : "";
  const urlTopic = onTours ? (params.get("topic") ?? "") : "";

  const [q, setQ] = useState(urlQ);
  const [topic, setTopic] = useState(urlTopic);
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
  // cancelled instantly. Ending the interaction cancels the edit: restore the committed draft.
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
    setQ(urlQ);
    setTopic(urlTopic);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [scrollWantsCollapsed, activeSection, searchFocusWithin, forceExpanded, urlQ, urlTopic]);

  /** Commit the current draft as the search (compact/expanded Search action). */
  const commitSearch = useCallback(() => {
    pushRecentUniversity(q);
    if (onTours) {
      const next = new URLSearchParams(params.toString());
      if (q.trim()) next.set("q", q.trim());
      else next.delete("q");
      if (topic) next.set("topic", topic);
      else next.delete("topic");
      next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `/tours?${qs}` : "/tours", { scroll: false });
    } else {
      router.push(buildToursHref(q, topic));
    }
    setForceExpanded(false);
    setPendingFocus(false);
    setActiveSection(null);
    setPanelVisible(false);
    setSheetOpen(false);
  }, [q, topic, onTours, params, router]);

  /** Expand the header without choosing a section. */
  const ensureExpanded = useCallback(() => setForceExpanded(true), []);

  /** Open a section: seed the draft from committed, mark it active, request focus, and either reveal
   *  the panel now (already expanded) or leave it for SiteHeader to reveal once the shell expands
   *  (collapsed → expanding). Topic must NOT touch University focus/suggestions. */
  const openSection = useCallback(
    (section: NonNullable<HeaderSection>) => {
      setQ(urlQ);
      setTopic(urlTopic);
      setActiveSection(section);
      setPendingFocus(true);
      if (collapsed)
        setForceExpanded(true); // reveal happens on the shell's transition-end
      else setPanelVisible(true); // already expanded → reveal immediately
    },
    [urlQ, urlTopic, collapsed],
  );

  /** Cancel editing: restore the committed draft, clear the active section + panel. */
  const cancelEditing = useCallback(() => {
    setForceExpanded(false);
    setPendingFocus(false);
    setSearchFocusWithin(false);
    setActiveSection(null);
    setPanelVisible(false);
    setQ(urlQ);
    setTopic(urlTopic);
  }, [urlQ, urlTopic]);

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

  /** Choose a topic from the Topic module: update the draft, close the panel, stay expanded. */
  const chooseTopic = useCallback((value: string) => {
    setTopic(value);
    setActiveSection(null);
    setPanelVisible(false);
  }, []);

  const onSearchFocusCapture = useCallback(() => setSearchFocusWithin(true), []);
  const onSearchBlurCapture = useCallback((e: React.FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSearchFocusWithin(false);
  }, []);

  const topicLabel = topicOptions.find((t) => t.value === urlTopic)?.label;
  const summary =
    [urlQ.trim() || null, topicLabel || null].filter(Boolean).join(" · ") || "Search tours";
  // Committed values for the compact 3-segment display (empty → the segment shows its placeholder).
  const universityValue = urlQ.trim();
  const topicValue = topicLabel ?? "";

  return {
    universityValue,
    topicValue,
    q,
    setQ,
    topic,
    setTopic,
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
    chooseTopic,
    cancelEditing,
    onUniversityFocus,
    onSearchFocusCapture,
    onSearchBlurCapture,
  };
}

export type HeaderSearch = ReturnType<typeof useHeaderSearch>;
