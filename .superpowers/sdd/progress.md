# CTL-55 frontend remediation — progress ledger

Plan: campus-tours-live/docs/superpowers/plans/2026-07-13-remediation-frontend-CTL-55.md
Branch: feat/CTL-55-availability-v2-ui Base: 91f571e Start HEAD: da0ccf4
Contract A from backend+bff (DONE): overrides/replace {date,kind,windows}, rules/replace {dayOfWeek,windows},
bookable+hasWeeklyHours ON RESOLVED response (GET /availability, NOT settings), preview `inert` per date.
Deploys LAST. Run SEQUENTIALLY (shared files). FE never recomputes availability.

- [x] T1 data-access (useReplaceOverrides/useReplaceRules + readiness types) — d43cbff (1052 green, typecheck+lint clean). bookable/hasWeeklyHours on RESOLVED type (verified); inert on preview day; hooks POST /v1/... invalidate rules+exceptions+resolved. (/api was brief typo; impl used /v1 correctly.)
- [x] T2 B2 DateOverrideModal atomic save — 49f3506 (25/25 green, inline-verified: single mutateAsync, reconcile removed). ORPHANED: useCreate/DeleteAvailabilityException (last consumer) -> S1/T6.
- [x] T3 B2 DayHoursModal atomic save — 0045c1a (15/15 green, verified: single mutateAsync, structural from<to kept, error keeps open). ORPHANED: useCreate/DeleteAvailabilityRule -> S1/T6 (useUpdateAvailabilityRule still used by WeeklyHoursPanel).
- [x] T4 B3 surface preview error — da50e99 (DateOverrideModal 27/27). REGRESSION FOUND: T2/T3 broke WeeklyHoursPanel+GuideAvailabilityPage tests (missing useReplace\* in jest.mock factory) - targeted runs missed it. Test-fix agent dispatched. LESSON: run FULL suite at end of each FE task.
- [x] T5 B1 readiness notice — ebe7d33 (full suite 1056 green). Reads resolvedQuery.data.bookable/hasWeeklyHours (RESOLVED, verified), two-signal copy, warning Alert, no recompute.
- [x] T6 S1 delete dead code — full suite 992 green, 0 fail (typecheck+lint clean), ~1423 LOC removed. Deleted: DurationField/UsDateField/ConfirmDeleteModal, buildToOptions/TO_OPTION_MINUTES/formatClockLabel, duration-preset machinery (DURATION_PRESETS/CUSTOM_DURATION_VALUE/DurationPreset/minutes<->preset), formatExceptionDate, single-slot preview path (useOverridePreview/overridePreviewOptions/override-preview.query.ts/availabilityPreview key/OverridePreviewParams), orphaned hooks useCreate/DeleteAvailabilityException + useCreate/DeleteAvailabilityRule + their 4 mutation factories. KEPT (still live): useUpdateAvailabilityRule (WeeklyHoursPanel), useOverrideMultiPreview, OverridePreviewResponse/Day, minutesFromHHmm, formatDuration/isValidWindowMin.
- [ ] T7 S7 warning !(before subset-of after) + 8a reconcile
- [ ] T8 minors 8b-8g
- REGRESSION FIXED e9b9c4c: added useReplace\* to sibling test mocks + 422 test via useReplaceOverrides. Full suite 1053 green, 0 fail.
