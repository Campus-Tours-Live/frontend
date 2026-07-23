/**
 * The single authority for the "empty or full set = no topic filter" rule. Keeps only ids that are
 * in the backend vocabulary (`allOptionValues`), in vocab order, deduped; collapses none or the
 * full set to `[]`. Callers that write the URL / build queries must pass canonical output.
 */
export function canonicalizeTopicIds(selected: string[], allOptionValues: string[]): string[] {
  const chosen = new Set(selected);
  const kept = allOptionValues.filter((v) => chosen.has(v)); // vocab order, deduped, unknowns dropped
  if (kept.length === 0 || kept.length === allOptionValues.length) return [];
  return kept;
}
