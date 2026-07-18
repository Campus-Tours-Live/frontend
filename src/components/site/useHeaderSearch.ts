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
 * useHeaderSearch — the shared STATE and behavior behind the global, two-tier header search.
 * It is deliberately DOM-free (no element refs): the scroll intent comes from `useHeaderScrollState`,
 * and the interaction lock is composed here —
 *   interactionLocked = searchFocusWithin || uniFocused || forceExpanded
 *   collapsed         = scrollWantsCollapsed && !interactionLocked
 *
 * `forceExpanded` is set by the compact pill (`openEditor`) and released by `SiteHeader`'s
 * outside-click / Escape effect. Focusing University after the band expands (`pendingFocus`) and the
 * outside-click release both live in `SiteHeader`, which owns the actual DOM refs — keeping this
 * hook's return free of ref values.
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
  const [uniFocused, setUniFocused] = useState(false);
  const [searchFocusWithin, setSearchFocusWithin] = useState(false);
  const [forceExpanded, setForceExpanded] = useState(false);
  const [pendingFocus, setPendingFocus] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // The interactive sections (Language is Soon → not a section). Drives which segment is highlighted
  // and, later (Commit B/C), which module panel is shown.
  const [activeSection, setActiveSection] = useState<HeaderSection>(null);

  const { data: matches } = useUniversitySearch(q, { enabled: q.trim().length >= 1 });
  const suggestions =
    q.trim().length >= 1 ? (matches ?? []).map((m) => m.name) : readRecentUniversities();

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

  const interactionLocked = searchFocusWithin || uniFocused || forceExpanded;
  const collapsed = scrollWantsCollapsed && !interactionLocked;

  // Any navigation cancels an in-flight edit intent (avoids a stray focus/expand on the next page).
  // Resetting this transient UI on route change is exactly this effect's job.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setForceExpanded(false);
    setPendingFocus(false);
    setUniFocused(false);
    setSearchFocusWithin(false);
    setActiveSection(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname]);

  // SOFT LOCK: focus / suggestions-open / forced-open keep the header expanded against scroll JITTER,
  // but a FRESH clear downward scroll overrides them — it ends the interaction so the header may
  // collapse. We act only on the false→true TRANSITION of the scroll-collapse intent (a genuinely new
  // downward gesture past the hook's threshold), never on the standing state — otherwise re-opening
  // via the compact control while already scrolled would be cancelled instantly. Any focus stranded in
  // the now-hidden form is blurred where the collapse is rendered (SiteHeader). (A future "hard lock" —
  // pointer inside a panel, native picker open, IME — would be exempted here.)
  const prevScrollWantsCollapsedRef = useRef(false);
  useEffect(() => {
    const wasWanting = prevScrollWantsCollapsedRef.current;
    prevScrollWantsCollapsedRef.current = scrollWantsCollapsed;
    if (wasWanting || !scrollWantsCollapsed) return; // only a fresh false→true transition
    if (!(searchFocusWithin || uniFocused || forceExpanded)) return;
    // Ending the interaction = cancel the edit: restore the committed draft so the compact segments
    // show committed (never a stray unsubmitted draft) and re-opening starts clean.
    /* eslint-disable react-hooks/set-state-in-effect */
    setForceExpanded(false);
    setUniFocused(false);
    setSearchFocusWithin(false);
    setPendingFocus(false);
    setActiveSection(null);
    setQ(urlQ);
    setTopic(urlTopic);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [scrollWantsCollapsed, searchFocusWithin, uniFocused, forceExpanded, urlQ, urlTopic]);

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
    setUniFocused(false);
    setActiveSection(null);
    setSheetOpen(false);
  }, [q, topic, onTours, params, router]);

  /** Expand the header without choosing a section (e.g. from the compact search-icon area). */
  const ensureExpanded = useCallback(() => setForceExpanded(true), []);

  /** Open a specific section: seed the draft from committed, expand, mark it active, and request
   *  focus for THAT section once the shell has expanded (SiteHeader performs the focus). Topic must
   *  NOT touch University focus/suggestions — no University flash. */
  const openSection = useCallback(
    (section: NonNullable<HeaderSection>) => {
      setQ(urlQ);
      setTopic(urlTopic);
      setForceExpanded(true);
      setActiveSection(section);
      setPendingFocus(true);
    },
    [urlQ, urlTopic],
  );

  /** Cancel editing: restore the committed draft, clear the active section, and collapse-eligible. */
  const cancelEditing = useCallback(() => {
    setForceExpanded(false);
    setPendingFocus(false);
    setUniFocused(false);
    setSearchFocusWithin(false);
    setActiveSection(null);
    setQ(urlQ);
    setTopic(urlTopic);
  }, [urlQ, urlTopic]);

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
    uniFocused,
    setUniFocused,
    searchFocusWithin,
    forceExpanded,
    setForceExpanded,
    pendingFocus,
    setPendingFocus,
    sheetOpen,
    setSheetOpen,
    suggestions,
    topicOptions,
    onTours,
    summary,
    collapsed,
    activeSection,
    setActiveSection,
    commitSearch,
    ensureExpanded,
    openSection,
    cancelEditing,
    onSearchFocusCapture,
    onSearchBlurCapture,
  };
}

export type HeaderSearch = ReturnType<typeof useHeaderSearch>;
