# CampusToursLive.ai — Web App

The user-facing **web app** for CampusToursLive.ai: a Next.js (App Router) front-end where
participants discover and book live student-guided campus tours and guides manage their offerings.
It renders the UI and talks to **one** backend — the **BFF** — never to the Core API or the database
directly.

> The web app (this repo), the **BFF**, and the **Core API** are **independent services, each in its
> own repository**. Where this app sits:
>
> ```
> browser ──▶ web app (this repo) ──▶ BFF ──▶ Core API ──▶ PostgreSQL
> ```
>
> The browser only ever talks to the web origin. `/auth/*`, `/api/*`, and `/v1/*` are proxied to the BFF by
> **Next.js rewrites** (see `next.config.ts`), so the session cookie stays **first-party** and there
> is no CORS. The app never sees OAuth tokens — auth is fully delegated to the BFF.

---

## Contents

- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Configuration (environment variables)](#configuration-environment-variables)
- [Project structure](#project-structure)
- [Routing & pages](#routing--pages)
- [Authentication & route protection](#authentication--route-protection)
- [Data layer (talking to the BFF)](#data-layer-talking-to-the-bff)
- [Styling & design system](#styling--design-system)
- [Testing](#testing)
- [Code quality](#code-quality)
- [Git hooks & commit conventions](#git-hooks--commit-conventions)
- [Build & deploy](#build--deploy)
- [Troubleshooting](#troubleshooting)

---

## Tech stack

| Concern       | Choice                                                                    |
| ------------- | ------------------------------------------------------------------------- |
| Framework     | **Next.js 16** (App Router, React Server Components)                      |
| UI runtime    | **React 19**                                                              |
| Language      | **TypeScript** (strict)                                                   |
| Bundler       | **Turbopack** (Next.js built-in, Rust-based — for both `dev` and `build`) |
| Styling       | **Tailwind CSS v3** + brand design tokens (`src/app/globals.css`)         |
| Data fetching | **TanStack Query v5** over a typed `fetch` wrapper                        |
| Forms         | **react-hook-form**                                                       |
| Icons         | **lucide-react**; class merging via `clsx` + `tailwind-merge`             |
| Fonts         | **Quicksand** (display) + **Nunito** (text) via `next/font`               |
| Linting       | **ESLint 9** (flat config) + `eslint-config-next`                         |
| Testing       | **Jest** + **React Testing Library** (wired through `next/jest`)          |

> **Why no Webpack/Vite config?** Next.js owns the build pipeline; Next 16 defaults to Turbopack for
> dev and build. There's nothing to configure and Vite isn't used with Next.js.

---

## Prerequisites

- **Node.js 20+** (matches the BFF / Core repos). npm ships with Node.
- The **BFF** running and reachable (default `http://localhost:4000`) for anything that hits
  `/auth/*` or `/v1/*`. For a full login experience you also need the **Core** (and its Postgres)
  up — see [Getting started](#getting-started).

The app **renders** without the BFF, but sign-in and any data read/write will fail until the BFF
(and, behind it, the Core) are available.

---

## Getting started

```bash
npm install
npm run dev      # Next.js dev server on http://localhost:3001 (Fast Refresh / HMR)
```

The dev server is **pinned to port 3001** — the origin the BFF expects (its `WEB_ORIGIN` /
`GOOGLE_REDIRECT_URI`). `build` / `start` use the same port, so there's nothing to remember.

**Full local stack** (needed to actually sign in). The **Core API** and **BFF** are **separate
repositories** — clone and start them first (see each repo's README), then run this app:

1. **Core API** (its own repo) — start its Postgres + the service on `:8080`.
2. **BFF** (its own repo) — run it on `:4000`.
3. **Web app** (this repo) — `npm run dev` on `:3001`, with `BFF_URL` pointing at the BFF. The
   rewrites proxy `/auth/*`, `/api/*`, and `/v1/*` to the BFF same-origin.

**Auto-refresh:** keep `npm run dev` running while you work — saving a file updates the browser
instantly. Do **not** use `build`/`start` during development. If edits don't trigger a refresh (common
when the project lives in an iCloud-synced `~/Documents` folder, which drops file-change events), use
the polling variant:

```bash
npm run dev:poll
```

Scripts:

| Script                  | Does                                                     |
| ----------------------- | -------------------------------------------------------- |
| `npm run dev`           | Dev server on `:3001` (Fast Refresh)                     |
| `npm run dev:poll`      | Dev server with file-watch polling                       |
| `npm run build`         | Production build (Turbopack)                             |
| `npm run start`         | Serve the production build on `:3001`                    |
| `npm run lint`          | ESLint (`eslint .`)                                      |
| `npm run lint:fix`      | ESLint with autofix                                      |
| `npm run format`        | Prettier (write)                                         |
| `npm run format:check`  | Prettier (check only)                                    |
| `npm run typecheck`     | `tsc --noEmit`                                           |
| `npm test`              | Jest + RTL — runs with coverage (terminal + HTML report) |
| `npm run test:watch`    | Jest in watch mode                                       |
| `npm run test:coverage` | Explicit coverage alias (same as `npm test`)             |
| `npm run test:ci`       | Jest in CI mode                                          |

`predev` and `prebuild` also run automatically (npm lifecycle) — see **Agent skills** below.

---

## Agent skills (Codex & Claude)

This repo commits a `.claude/settings.json` (plugin marketplace + the skills this stack needs) and
a self-contained `.claude/hooks/ensure-plugins.mjs` that installs and keeps them updated for
**whichever agent CLI you have** — `claude` and/or `codex`. The `wshobson/agents` marketplace ships
dual Codex + Claude plugin manifests, so the same plugin ids work for both.

Auto-install (no extra command):

- **Claude Code** — opening the repo (a `SessionStart` hook that emits `reloadSkills`, so a
  first-time install is usable in the same session) and `npm run dev` (a `predev` step);
  `npm run build` only checks (`prebuild`, CI-safe).
- **Codex** — running the repo (`npm run dev` / the launcher) or `codex plugin add`.

Manual, **this repo only**: `npm run skills` (install missing) or `npm run skills:update` (update
to latest). It's a no-op when neither CLI is present and never blocks dev/build.

**Cursor (2.5+):** no plugin CLI or auto-install — install once **in the editor** (add the
`wshobson/agents` marketplace, then `/plugin install <name>` for the skills below). A committed
`.cursor/rules/agent-skills.mdc` gives Cursor the per-repo guidance automatically; Cursor doesn't
honor a skill's `tools:` allowlist.

Skills this repo enables (both agents unless noted):

| Skill / plugin                | Used for                                                 |
| ----------------------------- | -------------------------------------------------------- |
| `frontend-mobile-development` | React / Next.js UI                                       |
| `javascript-typescript`       | TypeScript / data-fetching patterns                      |
| `ui-design`                   | UI/UX design                                             |
| `ui-ux-pro-max`               | styles, palettes, typography — **Codex: built-in skill** |
| `unit-testing`                | Jest + Testing Library                                   |
| `security-scanning`           | XSS, dependency CVEs, `npm audit`                        |
| `comprehensive-review`        | multi-perspective code review                            |

> Process skills — `superpowers:*` (plan / TDD / debug), `frontend-design`, `webapp-testing` — are
> **Claude-only** user-level installs (see `../campus-tours-live/README.md`). In Codex, follow the
> same discipline with its built-in flow.

Which skill for which situation, and the cross-repo rules, are in `AGENTS.md` (Codex) and
`CLAUDE.md` (Claude).

---

## Configuration (environment variables)

Next.js has a hard split between server-only and browser-exposed variables, which matters here:

- **`NEXT_PUBLIC_*`** — inlined into the **browser** bundle at build time. Public, **never** put
  secrets here. Changing one requires a dev-server restart (or rebuild) to take effect.
- **No prefix** — available only on the **server** (RSC, route handlers, `next.config.ts`).

| Variable                      | Used by                                            | Purpose                                                                                                                                                                                              | Default                 |
| ----------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `BFF_URL`                     | `next.config.ts` rewrites + `getServerMe` (server) | BFF origin to proxy `/auth/*`, `/api/*`, `/v1/*` to, and for RSC guards                                                                                                                              | `http://localhost:4000` |
| `NEXT_PUBLIC_BFF_URL`         | `AuthOptions` (browser)                            | Where the browser starts sign-in. **Empty = same-origin (recommended)**                                                                                                                              | _(empty)_               |
| `NEXT_PUBLIC_ASSETS_BASE_URL` | `lib/assets.ts` `assetUrl` (browser)               | Public base for the app's own static images. Optional — a working default is baked in; override only for a custom CDN, whose host must then be allow-listed in `next.config` `images.remotePatterns` | _(baked-in R2 base)_    |

`NEXT_PUBLIC_BFF_URL` is empty by default on purpose: `"" + "/auth/login"` is a **same-origin
relative URL**, which the rewrites forward to the BFF (keeping the session cookie first-party). Only
set it if you deliberately want the browser to call the BFF **cross-origin**. Copy `.env.example` →
`.env.local` and adjust as needed: `.env` and `.env*.local` are git-ignored, while `.env.example` is
the committed template.

> **The web app holds no secrets.** `BFF_URL` is just an origin, not a credential. In particular
> there is **no `SESSION_SECRET` here** — that's a BFF-only value used to encrypt the session cookie.
> The web app never decrypts the cookie; it only forwards it to the BFF. So there is nothing on the
> frontend that has to "match" the BFF's `SESSION_SECRET`.

---

## Project structure

```
src/
├── proxy.ts                 # Next 16 Proxy (route guard — redirect logged-out users pre-render)
├── app/                     # App Router — routes, layouts, RSC guards
│   ├── layout.tsx           #   root: fonts, QueryProvider, SessionExpiredModal
│   ├── globals.css          #   design tokens + semantic component classes
│   ├── page.tsx             #   "/" home
│   ├── (app)/               #   signed-in area (layout = server-side role guard)
│   │   ├── dashboard/ profile/ support/
│   ├── onboarding/          #   guide / participant onboarding
│   ├── signup/              #   role | participant | guide
│   ├── signin/
│   └── staff/               #   staff area (own layout)
├── components/
│   ├── ui/                  #   design-system primitives (Button, Card, Modal, Badge, Field…)
│   ├── site/                #   chrome: AppShell, headers, nav
│   ├── home/ tours/ dashboard/ signup/ auth/   # feature components
│   ├── availability/        #   guide availability: weekly hours, date overrides, calendars
│   ├── offerings/           #   tour offerings (guide supply side)
│   └── profile/             #   guide/participant profile views + forms
├── lib/
│   ├── data-access/         #   React Query layer: http, keys, queries/, mutations/, hooks/, types
│   ├── http/                #   apiFetch (client) + getServerMe (server-only) + barrel
│   ├── auth/                #   authGate + authNotice (re-auth prompt vs banner) + returnTo helpers
│   ├── availability/        #   from–to / duration / day-window helpers shared by the panels
│   ├── utils/cn.ts          #   className merge (clsx + tailwind-merge)
│   ├── assets.ts            #   assetUrl for the app's static images (R2)
│   ├── errors.ts            #   shared error→message mapping for form submits
│   └── format.ts            #   display formatting (e.g. "member since" month-year)
└── hooks/                   # generic UI hooks (useDisclosure, useDropdown, useScrollLock…)
```

---

## Routing & pages

File-based **App Router** routing under `src/app/`. Folders are routes; `layout.tsx` wraps a subtree;
the `(app)` folder is a **route group** (groups routes under one layout without adding a URL segment).

| Route                                    | Area      | Notes                                            |
| ---------------------------------------- | --------- | ------------------------------------------------ |
| `/`                                      | public    | Home / marketing                                 |
| `/signin`                                | public    | Sign-in entry (delegates to the BFF)             |
| `/signup/role` `…/participant` `…/guide` | public    | Choose a role / start onboarding                 |
| `/onboarding/guide` `…/participant`      | protected | Complete a role's onboarding                     |
| `/dashboard` `/profile` `/support`       | protected | Signed-in app area — `(app)` group, role-guarded |
| `/staff`                                 | protected | Staff (ADMIN / SUPPORT) area, own layout         |

**Server vs Client Components:** pages and layouts are **Server Components** by default (they can read
cookies and run guards server-side). Components that need browser APIs, state, or events opt in with
`"use client"` (e.g. the UI primitives, `AppShell`, the auth modal).

---

## Authentication & route protection

The app **never handles passwords or tokens** — sign-in is delegated to the BFF (Google OAuth,
Authorization Code + PKCE; tokens live in a BFF-owned httpOnly session cookie). Login is just a
navigation: a button sends the browser to `/auth/login` (rewritten to the BFF) → Google → the BFF
callback establishes the session and redirects back.

Protection is layered, because no single layer covers every case:

1. **`src/proxy.ts`** (Next 16 Proxy convention, server, pre-render) — **coarse** guard: redirects a
   visitor with **no session cookie** away from protected routes to `/signin` (so a protected page
   never flashes for a signed-out user). It only checks cookie **presence**, not validity.
2. **RSC layout guards** (e.g. `app/(app)/layout.tsx`) — **role-aware**: `getServerMe()` asks the BFF
   who the user is and redirects based on **held roles** (no role → `/signup/role`; staff-only →
   `/staff`). Authorization is always server-side.
3. **Client re-auth gate** (`src/lib/auth/authGate.ts` + `SessionExpiredModal`) — handles a session
   that expires **mid-page**: when an in-page `apiFetch` gets `401` **with**
   `Auth-Required: reauthenticate`, the gate opens the sign-in modal and (for safe requests) retries
   after re-auth. A plain `401`/`403` does **not** trigger this.

   Dismissing the modal means "not right now", not "never ask again": the decline is recorded
   against an auth **epoch** that any later auth event (a route change, an explicit sign-in) moves
   past, so a deliberate action minutes later still prompts. The request that was interrupted
   rejects with `AuthCancelledError`, which the UI reports as an auth state rather than letting it
   fall into a component's generic "failed to load" branch — the cause was a user's choice, not a
   broken page.

4. **Session notice banner** (`SessionNoticeBanner`) — the non-blocking half. A **background** read
   that discovers a dead session raises a banner instead of seizing the page, since the user did not
   ask for anything; the modal is reserved for what they did ask for. It also carries the case where
   the BFF answers `503` because it could not reach Google: the session is intact and the server
   says so, so that state must not render as a sign-out and offers no sign-in button.

The BFF is the source of truth: it silently refreshes when it can, and only emits
`Auth-Required: reauthenticate` when a real re-login is needed.

---

## Data layer (talking to the BFF)

All data access goes through `src/lib/data-access/` (a thin **TanStack Query** layer over a typed
`fetch` wrapper). Successful responses are unwrapped from the BFF's `{ data, meta }` envelope; errors
are `application/problem+json`.

- **`apiFetch(path, init)`** (`lib/http/api.ts`) — the only client allowed to touch the `/vN/*`
  resource API. It rejects non-versioned paths and sends credentials `same-origin`. How a re-auth
  `401` surfaces is chosen per call with `escalate`, by asking **who caused the request**:
  - `"prompt"` (default) — the user clicked, submitted, or opened a protected page, so interrupting
    them is proportionate;
  - `"ambient"` — the page issued it by itself (the header's principal read, a background refetch).
    Raise a notice and keep the page usable;
  - `"none"` — a genuinely public resource an anonymous visitor may read, so a `401` there is just
    "not signed in" and is the caller's to interpret.

  Do not pick `"none"` merely because a call can also run on a public page: `/v1/userinfo` is
  protected and only issued once the session probe has said the user is authenticated, so a `401`
  there is a session that died, not an anonymous visitor.

- **`apiJson` / `patchJson` / `postJson`** (`data-access/http.ts`) — unwrap `{ data }` and throw
  `ApiError` (carrying the HTTP status) on non-2xx.
- **`queryKeys`** (`data-access/keys.ts`) — one central key factory, so reads and the mutations that
  invalidate them can't drift.
- **`queries/`, `mutations/`, `hooks/`** — each feature has a query/mutation definition and a
  `use-*` hook (e.g. `useDashboard`, `useUpdateGuideProfile`, `useSetActiveRole`).
- **`QueryProvider`** — one shared `QueryClient` (30s `staleTime`; retries only transient
  network/5xx errors, never a 4xx or a cancelled re-auth).
- **`getServerMe()`** (`lib/http/serverMe.ts`) — **server-only** principal fetch for RSC guards; it
  forwards the session cookie to the BFF and never decrypts it. Intentionally not exported from the
  client barrel.

---

## Styling & design system

Brand values are HSL CSS variables in `src/app/globals.css`, mapped to Tailwind utilities in
`tailwind.config.ts`. **Light theme only.** See **`DESIGN_TOKENS.md`** for the full reference.

Two ways to style, both reading the same tokens:

- **Token utilities** — `bg-primary`, `text-ink-soft`, `rounded-card`, `border-border/70` (opacity
  supported).
- **Semantic component classes** (in `globals.css` `@layer components`) — write one class instead of a
  long utility string: `btn btn-primary`, `card card-pad`, `badge badge-verified`,
  `status status-success`, `alert alert-error`, `h1`/`h2`/`lead`/`eyebrow`, etc.

Fonts are loaded with `next/font` in `app/layout.tsx` (Quicksand → `font-display`, Nunito →
`font-sans`). Reusable primitives live in `src/components/ui/`; merge conditional classes with
`cn()` (`lib/utils/cn.ts`).

---

## Testing

```bash
npm test               # all tests + coverage report + HTML report
npm run test:watch     # watch mode
npm run test:coverage  # explicit alias for the coverage run
npm run test:ci        # CI mode
```

- **Jest + React Testing Library**, wired through `next/jest` (SWC compile, `next/font` + CSS module
  mocking, the `@/*` alias — all handled automatically). Environment: `jsdom`.
- Tests live in a top-level **`tests/`** folder, split by layer:
  - `tests/unit/**` — isolated units (pure logic or mocked deps).
  - `tests/integration/**` — real hooks / React Query with mocked network, exercising composed UIs.
- **Coverage is collected on every run** (`collectCoverage` is on): each `npm test` prints a terminal
  summary and writes an **HTML report to `coverage/lcov-report/index.html`** — regenerated each run
  (`coverage/` is git-ignored). Collected from `src/**` (excluding `.d.ts` and the root layout).
- **Coverage is 100%** (statements / branches / functions / lines); a small number of genuinely
  unreachable defensive branches are marked `/* istanbul ignore */`.
- **Coverage gate: 90%** across statements / branches / functions / lines — identical to the BFF and
  Core repos. Enforced on every run (coverage is always collected).

---

## Code quality

```bash
npm run lint           # ESLint (eslint .) — flat config + eslint-config-next
npm run lint:fix       # ESLint with autofix
npm run format         # Prettier (write)
npm run format:check   # Prettier (check only)
npm run typecheck      # tsc --noEmit
```

ESLint 9 (flat config) extends `eslint-config-next`, with `eslint-config-prettier` last so **Prettier
owns formatting** and the two don't fight. Prettier config: `.prettierrc.json` (semicolons,
trailing commas, 100-col). TypeScript runs in strict mode.

---

## Git hooks & commit conventions

Git hooks are managed by **husky** and installed automatically on `npm install` (via the `prepare`
script). They match the BFF and Core repos.

| Hook         | Runs          | Purpose                                   |
| ------------ | ------------- | ----------------------------------------- |
| `pre-commit` | `lint-staged` | ESLint `--fix` + Prettier on staged files |
| `commit-msg` | `commitlint`  | Enforces the commit convention below      |
| `pre-push`   | `npm test`    | Jest suite must pass before pushing       |

**Commit message format** (identical across all three repos):

```
<type>: <BOARD>-<NUMBER> <description>
```

- `<type>` — `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`,
  `revert` (an optional scope is allowed: `fix(auth): …`).
- `<BOARD>` — Jira board key, uppercase (e.g. `CTL`); `<NUMBER>` — the ticket number.

Examples: `feat: CTL-1234 add dashboard skeleton`, `fix(auth): CTL-987 handle reauth modal`. Commits
missing the type or the `<BOARD>-<NUMBER>` ticket are rejected. Bypass in an emergency with
`git commit --no-verify` / `git push --no-verify`.

> **Note:** as a standalone repository the hooks install and run out of the box. (If this folder is
> ever nested inside another git repo, husky targets that outer root instead — run git from this
> repo's own root.)

---

## Pull requests

Open a PR against `main` (direct pushes are blocked by a branch ruleset). The gate requires:

- **A filled-in `.github/pull_request_template.md`** — a real **Summary** (>= 100 characters / 15 words) and **Testing** (>= 40 characters / 7 words), and at least one **Type of change** box checked. Placeholder / junk / gibberish text and an identical Summary and Testing are rejected; an AI step in the same check also verifies the description matches the diff.
- **Before / After screenshots** under **## Screenshots** for changes that touch UI files (`.tsx` / `.jsx` / `.css`, ...). Markdown-, config-, and `.ts`-only changes are exempt (or check only "Docs / chore / config").
- All required checks green + **1 approving review**.

## Build & deploy

```bash
npm run build          # production build (Turbopack)
npm run start          # serve the build
```

- The app is an **SSR Next.js server** (it reads cookies and runs RSC guards), so it needs a Node
  runtime — not a static export.
- In production, set **`BFF_URL`** to the real BFF origin so the rewrites and `getServerMe` point at
  it; serve the app on the origin registered as the BFF's `WEB_ORIGIN` / Google redirect URI.
- Keep the browser and BFF **same-origin** (via the rewrites) so the session cookie is first-party.

---

## Troubleshooting

| Symptom                                        | Cause & fix                                                                                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `/v1/*` or `/auth/*` returns 404               | Rewrites not active — `BFF_URL` unset, or the BFF isn't running. Set `BFF_URL` and start the BFF.                                      |
| Signed in but immediately bounced to `/signin` | The session cookie isn't first-party. The dev server is pinned to `:3001` (the BFF's origin) — make sure you didn't override the port. |
| Login redirect fails / `redirect_uri_mismatch` | The web app's origin must match the BFF's `GOOGLE_REDIRECT_URI` and the Google client's redirect URI (all `:3001`).                    |
| `NEXT_PUBLIC_*` change not taking effect       | These are inlined at build time — restart the dev server (or rebuild).                                                                 |
| Hydration mismatch warning                     | Server and client rendered differently — avoid `Date.now()`/`window` in render; gate browser-only code behind `useEffect`.             |
| Saving a file doesn't refresh the browser      | iCloud-synced folders drop file events — use `npm run dev:poll`.                                                                       |
