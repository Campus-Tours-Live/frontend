"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TourCatalogSort } from "@/lib/data-access";

const SORTS = new Set<TourCatalogSort>(["RECOMMENDED", "RATING", "PRICE_ASC", "PRICE_DESC"]);
const QUERY_DEBOUNCE_MS = 250;

export interface TourListState {
  query: string;
  topicIds: string[];
  sort: TourCatalogSort;
  page: number;
  changeQuery: (v: string) => void;
  changeTopics: (ids: string[]) => void;
  changeSort: (v: TourCatalogSort) => void;
  setPage: (p: number) => void;
  reset: () => void;
}

/**
 * List state for the /tours marketplace, persisted in the URL query string so refresh,
 * back/forward, and shared links restore it. The URL is the source of truth for
 * topicIds/sort/page; `q` is debounced-synced local state so the search input stays responsive.
 * Filter changes replace (+ reset to page 1); page changes push (Back returns to the prior page).
 */
export function useTourListState(): TourListState {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Raw parse + dedupe only — this hook has no topic vocabulary, so it cannot apply the
  // empty/full-set canonicalisation rule; that happens where the vocab is available
  // (AllToursPage), via the shared `canonicalizeTopicIds`. Accepts repeated params AND comma
  // lists (backward compatible with a single `topic=CODE`).
  const topicIds = Array.from(
    new Set(
      params
        .getAll("topic")
        .flatMap((s) => s.split(","))
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
  const sortParam = params.get("sort") as TourCatalogSort | null;
  const sort = sortParam && SORTS.has(sortParam) ? sortParam : "RECOMMENDED";
  const pageParam = Number(params.get("page"));
  const page = Number.isFinite(pageParam) && pageParam > 1 ? pageParam - 1 : 0;

  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);

  // Build a URL from a partial patch of the current params; "" / null delete the key.
  // `topicPatch`, when provided, replaces the (possibly repeated) `topic` key wholesale.
  const buildUrl = useCallback(
    (patch: Record<string, string | null>, topicPatch?: string[]) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (topicPatch !== undefined) {
        next.delete("topic");
        for (const id of topicPatch) next.append("topic", id);
      }
      const qs = next.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [params, pathname],
  );

  // Keep the input in sync when the URL's q changes externally (back/forward). No loop: after our
  // own debounced write lands, urlQuery === query, so this is a no-op.
  useEffect(() => {
    // Syncing local input state to an external source (the URL) is exactly this effect's job;
    // it's a no-op once they match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery((prev) => (prev === urlQuery ? prev : urlQuery));
  }, [urlQuery]);

  // Debounce query -> URL; a search change also resets to page 1. Skip the initial mount so we
  // don't rewrite the URL for state we just read from it.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (query === urlQuery) return; // already reflected (e.g. synced from back/forward)
    const t = setTimeout(() => {
      router.replace(buildUrl({ q: query || null, page: null }), { scroll: false });
    }, QUERY_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, urlQuery, router, buildUrl]);

  const changeTopics = useCallback(
    (ids: string[]) => router.replace(buildUrl({ page: null }, ids), { scroll: false }),
    [router, buildUrl],
  );
  const changeSort = useCallback(
    (v: TourCatalogSort) =>
      router.replace(buildUrl({ sort: v === "RECOMMENDED" ? null : v, page: null }), {
        scroll: false,
      }),
    [router, buildUrl],
  );
  const setPage = useCallback(
    (p: number) => router.push(buildUrl({ page: p > 0 ? String(p + 1) : null }), { scroll: false }),
    [router, buildUrl],
  );
  const reset = useCallback(() => {
    setQuery("");
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  return {
    query,
    topicIds,
    sort,
    page,
    changeQuery: setQuery,
    changeTopics,
    changeSort,
    setPage,
    reset,
  };
}
