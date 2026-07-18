"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTourTopics, useUniversitySearch } from "@/lib/data-access";
import { pushRecentUniversity, readRecentUniversities } from "./recentUniversities";
import { useHeaderSearchCollapse } from "./useHeaderSearchCollapse";

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
 * useHeaderSearch — all state and behavior behind the global, two-tier header search
 * (Airbnb-style: an expanded band that collapses to a compact pill on scroll). The band
 * (row 2) and the pill (row 1) live in different DOM rows in `SiteHeader` but must act as
 * one control, so every bit of shared state — the draft (q/topic), expand/collapse, the
 * University suggestions dropdown, the mobile sheet, and submit — is centralized here.
 *
 * Collapse is purely scroll-driven (>threshold px) on every page, including /tours; there
 * is no per-route override. `expanded` (the user explicitly reopened the band to edit)
 * always wins over the scroll position.
 */
export function useHeaderSearch(threshold = 80) {
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
  const [expanded, setExpanded] = useState(false);
  const [uniFocused, setUniFocused] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: matches } = useUniversitySearch(q, { enabled: q.trim().length >= 1 });
  const suggestions =
    q.trim().length >= 1 ? (matches ?? []).map((m) => m.name) : readRecentUniversities();

  const collapsed = useHeaderSearchCollapse(threshold) && !expanded;

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
    setExpanded(false);
    setUniFocused(false);
    setSheetOpen(false);
  };

  const openEditor = () => {
    setQ(urlQ);
    setTopic(urlTopic);
    setExpanded(true);
  };

  const topicLabel = topicOptions.find((t) => t.value === urlTopic)?.label;
  const summary =
    [urlQ.trim() || null, topicLabel || null].filter(Boolean).join(" · ") || "Search tours";

  return {
    q,
    setQ,
    topic,
    setTopic,
    expanded,
    setExpanded,
    uniFocused,
    setUniFocused,
    sheetOpen,
    setSheetOpen,
    suggestions,
    topicOptions,
    onTours,
    summary,
    collapsed,
    submit,
    openEditor,
  };
}

export type HeaderSearch = ReturnType<typeof useHeaderSearch>;
