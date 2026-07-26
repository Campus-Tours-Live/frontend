const KEY = "cttl:recent-universities";
const MAX = 5;

/** Recently-submitted university queries, most-recent-first. Safe on the server / bad JSON. */
export function readRecentUniversities(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "string") : [];
  } catch {
    return [];
  }
}

/** Prepend `name` (de-duplicated, capped at 5); blank names are ignored. */
export function pushRecentUniversity(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (!trimmed) return;
  const next = [trimmed, ...readRecentUniversities().filter((n) => n !== trimmed)].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage disabled — non-fatal */
  }
}
