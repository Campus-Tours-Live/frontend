Rewritten onboarding/signup components

Goal:
- Preserve runtime behavior, visible text, routes, API calls, validation, and styling.
- Make the files easier to read by removing oversized implementation-history comments.
- Keep important inline coverage directives such as `/* istanbul ignore next */`.
- Remove the dead commented-out duplicate implementation from RoleCard.tsx.

Files:
- AuthOptions.tsx
- EnrollmentYearFields.tsx
- GuideOnboardingForm.tsx
- OnboardingCancel.tsx
- ParticipantOnboardingForm.tsx
- RoleCard.tsx
- UniversityField.tsx
- UniversityMultiSelect.tsx
