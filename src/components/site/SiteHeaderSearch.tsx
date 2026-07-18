"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Button, Drawer } from "@/components/ui";
import { useTourTopics, useUniversitySearch } from "@/lib/data-access";
import { cn } from "@/lib/utils";
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

/**
 * SiteHeaderSearch — the single, global, Airbnb-style segmented search (University · Topic ·
 * Language). Expanded at the top of a page, it collapses to a compact pill on scroll and whenever
 * the page is /tours. Submitting navigates to /tours (push) or refines it in place (replace). The
 * Language segment is disabled in Phase 1 (badged "Soon") until the backend can filter by language.
 */
export function SiteHeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const onTours = pathname === "/tours";

  const { data: topics } = useTourTopics();
  const topicOptions = topics ?? [];

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

  const collapsed = useHeaderSearchCollapse(80, onTours) && !expanded;

  const submit = () => {
    pushRecentUniversity(q);
    const href = buildToursHref(q, topic);
    if (onTours) router.replace(href, { scroll: false });
    else router.push(href);
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

  const desktop = collapsed ? (
    <button
      type="button"
      onClick={openEditor}
      aria-label="Edit search"
      className="search hidden min-w-0 max-w-sm flex-1 items-center justify-between text-left lg:flex"
    >
      <span className="truncate text-ink-soft">{summary}</span>
      <Search size={18} strokeWidth={2} aria-hidden />
    </button>
  ) : (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn("search hidden min-w-0 max-w-2xl flex-1 items-stretch gap-0 p-1 lg:flex")}
    >
      <div className="relative flex min-w-0 flex-1 flex-col">
        <label className="flex min-w-0 flex-col px-3 py-1">
          <span className="text-[11px] font-bold text-ink">University</span>
          <input
            type="text"
            aria-label="University"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setUniFocused(true)}
            onBlur={() => setTimeout(() => setUniFocused(false), 120)}
            placeholder="Search a school"
            className="min-w-0 bg-transparent text-ui-sm outline-none placeholder:text-ink-soft"
          />
        </label>
        {uniFocused && suggestions.length > 0 ? (
          <ul
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

      <span className="flex flex-col px-3 py-1 opacity-50" title="Coming soon">
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

  return (
    <>
      {/* Mobile: a pill that opens the full search sheet */}
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
          <div className="flex items-center justify-between opacity-50">
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

      {desktop}
    </>
  );
}
