Rewritten navigation/header components

Purpose
-------
These rewrites keep the executable behavior and visible UI of the uploaded files intact,
while making the source easier to read.

What changed
------------
- Removed oversized explanatory/history comments.
- Removed JSX-only comments that do not affect rendering.
- Preserved executable code, JSX, visible strings, Tailwind classes, routes, event handlers,
  hooks, API calls, accessibility attributes, and component props.
- Preserved eslint/coverage directives that may affect tooling.
- Added one short description per file.

Files
-----
AccountNav.tsx
AccountSidebar.tsx
AppShell.tsx
Breadcrumb.tsx
HeaderNav.tsx
MobileNav.tsx
OnboardingBreadcrumb.tsx
RoleSwitcher.tsx
SiteHeader.tsx
SiteHeaderSearch.tsx
