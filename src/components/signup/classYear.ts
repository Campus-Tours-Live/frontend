// Expected graduation year sits in a bounded window: the earliest is 10 years back (recent alumni
// can guide too), and the latest is this year plus a per-degree buffer (roughly the program's
// length for a current student). Year granularity means term/quarter timing never makes a year
// invalid, and the window shifts forward on its own each year.
export const CLASS_YEAR_FLOOR_YEARS = 10;

/** Years past the current year still valid as an expected graduation year, per degree level. */
export function gradYearBufferForDegree(degree: string | undefined): number {
  const t = (degree ?? "").toLowerCase();
  if (/doctor|first professional/.test(t)) return 9;
  if (/master|post-baccalaureate/.test(t)) return 3;
  if (/bachelor/.test(t)) return 6;
  if (/associate|certificate|diploma/.test(t)) return 3;
  return 8; // no / unknown degree → generous cap
}
