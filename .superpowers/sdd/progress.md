# CTL-55 frontend remediation — progress ledger

Plan: campus-tours-live/docs/superpowers/plans/2026-07-13-remediation-frontend-CTL-55.md
Branch: feat/CTL-55-availability-v2-ui Base: 91f571e Start HEAD: da0ccf4
Contract A from backend+bff (DONE): overrides/replace {date,kind,windows}, rules/replace {dayOfWeek,windows},
bookable+hasWeeklyHours ON RESOLVED response (GET /availability, NOT settings), preview `inert` per date.
Deploys LAST. Run SEQUENTIALLY (shared files). FE never recomputes availability.

- [x] T1 data-access (useReplaceOverrides/useReplaceRules + readiness types) — d43cbff (1052 green, typecheck+lint clean). bookable/hasWeeklyHours on RESOLVED type (verified); inert on preview day; hooks POST /v1/... invalidate rules+exceptions+resolved. (/api was brief typo; impl used /v1 correctly.)
- [ ] T2 B2 DateOverrideModal atomic save (useReplaceOverrides)
- [ ] T3 B2 DayHoursModal atomic save (useReplaceRules)
- [ ] T4 B3 surface previewQuery.error
- [ ] T5 B1 two-signal readiness notice (reads RESOLVED bookable/hasWeeklyHours)
- [ ] T6 S1 delete dead code
- [ ] T7 S7 warning !(before subset-of after) + 8a reconcile
- [ ] T8 minors 8b-8g
