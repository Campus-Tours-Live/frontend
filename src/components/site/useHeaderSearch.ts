"use client";

import { useCallback, useEffect, useState } from "react";
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
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname]);

  const submit = () => {
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
    setSheetOpen(false);
  };

  /** Compact-pill click: seed the draft from the URL, force the band open, and flag that University
   *  should be focused once the band has expanded (SiteHeader performs the focus). */
  const openEditor = () => {
    setQ(urlQ);
    setTopic(urlTopic);
    setForceExpanded(true);
    setPendingFocus(true);
  };

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
    submit,
    openEditor,
    onSearchFocusCapture,
    onSearchBlurCapture,
  };
}

export type HeaderSearch = ReturnType<typeof useHeaderSearch>;
