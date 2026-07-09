# Agent & contributor guide

Conventions in this repo are **enforced by CI** — skipping them blocks the merge.
If you (human or AI agent) open a PR, follow these.

## Pull requests

Fill out the PR description using `.github/pull_request_template.md`. The required
`pr-template` check needs:

- a non-empty **## Summary**
- a non-empty **## Testing** section
- at least one **## Type of change** box checked (`- [x]`)

The template is **not** auto-applied when a PR is created via `gh pr create` or by an
agent, so pass a `--body` that includes those sections yourself.

## Commits

Conventional Commits **plus a Jira ticket**:

    <type>: <BOARD>-<NUMBER> <description>
    e.g. feat: CTL-1234 add Google OIDC callback

Types: `feat fix docs style refactor perf test build ci chore revert`.
Enforced by a local `commit-msg` hook (installed on first `./mvnw` / `npm install`).

## What blocks a merge

- `ci` — unit + integration tests, project coverage gate, and ≥80% patch coverage on changed lines
- `pr-template` — the PR-description checks above
- a pull request is required (no direct push to `main`) with **1 approving review**

---

# Claude skills — when to use what (frontend)

This repo is **frontend** (`:3001`, Next.js 16 / React 19 / TS / TanStack Query / Tailwind).
It is one of three services: `frontend (:3001) → bff (:4000) → backend (:8080)`.

Skills are **not** auto-applied every turn — Claude picks them per-message from their
`description`. The table below steers that choice. To force a skill, type **its own slash
command** (e.g. `/code-review`); `/plugin` only installs/manages plugins — it does not invoke them.

> **Setup is automatic.** This repo's plugins are declared in `.claude/settings.json` and get
> installed for you on first use: a `SessionStart` hook (every Claude session) and the `predev`
> step (`npm run dev`) both run `.claude/hooks/ensure-plugins.mjs`. Accept the workspace-trust
> dialog once so they load. The `SessionStart` hook also emits `reloadSkills`, so a first-time
> install is usable in the **same** session (from the first prompt); `predev`/the launcher run
> outside a Claude session, so they only prepare the **next** one — but they print a hint to run
> `/reload-plugins`, which pulls a fresh install into an already-open session without a restart.
> They also keep enabled plugins **updated to latest** (throttled to ~once/day so session start
> stays fast; update everything now with the launcher's `npm run update:skills`).
>
> **`†` = user-level skill.** Rows marked `†` (`superpowers:*`, `frontend-design`,
> `webapp-testing`, `doc-coauthoring`) come from the **user-level** `superpowers` /
> `example-skills` plugins — this repo does **not** auto-install them. Install them once at the
> user level (see `campus-tours-live/CLAUDE.md` → "One-time setup"). Everything unmarked is
> auto-installed by this repo.

## Situation → skill

| When you are…                                                    | Use this skill                                                                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Planning any new feature / behavior change (think before coding) | `superpowers:brainstorming` †                                                                                                              |
| Refactoring (no behavior change)                                 | `superpowers:brainstorming` †, then `comprehensive-review`                                                                                 |
| Layout, color, typography, visual direction                      | `ui-design`, `ui-ux-pro-max`, `frontend-design` †                                                                                          |
| React components / hooks / Server vs Client boundary             | `frontend-mobile-development`, `javascript-typescript`                                                                                     |
| Next.js App Router / SSR / data fetching                         | `frontend-mobile-development`                                                                                                              |
| Calling the bff API (types, TanStack Query)                      | `javascript-typescript`                                                                                                                    |
| **Accessibility (a11y)** — public, student-facing UI             | ⚠️ no dedicated skill yet — use `frontend-design` † + `superpowers:brainstorming` † and follow WCAG (semantics, focus, contrast, keyboard) |
| Performance / Core Web Vitals / bundle size                      | `frontend-mobile-development` (no dedicated perf skill — measure first, then optimize)                                                     |
| Env / config changes (`BFF_URL`, ports, `.env`)                  | ⚠️ cross-repo — port `:3001` is fixed (bff `WEB_ORIGIN` + Google OAuth redirect depend on it); see Cross-repo rules below                  |
| Writing / adding unit & component tests (Jest + Testing Library) | `unit-testing`, `superpowers:test-driven-development` †                                                                                    |
| End-to-end UI verification in a real browser                     | `webapp-testing` †                                                                                                                         |
| Dependency upgrades / CVE remediation / `npm audit`              | `security-scanning`                                                                                                                        |
| Checking security (XSS, dependency CVEs, token storage)          | `security-scanning`                                                                                                                        |
| Fixing a red CI / failing build                                  | `superpowers:systematic-debugging` † (reproduce locally: `npm run lint && npm run typecheck && npm test`)                                  |
| Debugging (any bug / test failure / unexpected behavior)         | `superpowers:systematic-debugging` †                                                                                                       |
| Writing docs / README / comments                                 | `doc-coauthoring` †                                                                                                                        |
| Reviewing your own or someone else's PR, before merging          | `comprehensive-review`, `/code-review`; security via `/security-review`                                                                    |
| **"Live" real-time tours (WebRTC / WebSocket)**                  | ⚠️ product core, **no skill and no infra yet** — always `superpowers:brainstorming` † and design before coding                             |

## ⚠️ Cross-repo observation rules (read before changing frontend)

Frontend changes are rarely safe in isolation. When you touch any of the following,
**you must also check the other two repos** (full matrix in `campus-tours-live/CLAUDE.md`):

- **Changing API calls / data types** → first confirm the matching route in **bff** (`bff`
  is the proxy/aggregation layer; the shape it returns is the source of truth, not backend
  directly). Trace back to the **backend** DTO only if needed.
- **Changing auth / login flow / reading session** → session/cookies are owned by **bff**
  (`SESSION_SECRET`, Google OAuth). The frontend only consumes the session bff gives it — do
  not run OAuth against backend directly. Read bff before changing anything here.
- **Env / ports / OAuth** → `:3001` is fixed; bff's `WEB_ORIGIN` and Google's redirect URI
  depend on it. Never change the port, `BFF_URL`, or the OAuth client without coordinating bff,
  backend, and the Google Console — see the hub's "Cross-repo environment contract".
- **Adding a feature that needs backend support** → the coordination order is
  **backend defines the contract → bff adapts → frontend consumes**. If backend/bff don't
  provide it yet, open an issue / align the contract first — don't mock in frontend and merge.
- **If you only cloned frontend** → you can't read bff/backend locally. Work against the agreed
  Contract A (the bff response shape) via its OpenAPI/contract or an issue; don't guess backend
  internals. Clone the siblings (`npm run clone-all` in campus-tours-live) when a change spans layers.

> Rule of thumb: if your change alters "what flows between frontend and bff", it is a
> cross-repo change — at minimum **read** the corresponding bff code (and possibly backend),
> and verify end-to-end with the launcher (`npm run start:all`). See the "Cross-repo
> coordination" section in `campus-tours-live/CLAUDE.md`.

## Labels

**Change-failure labels** — when a PR **fixes something a recent change broke**, label the fix PR so
the weekly DORA report can compute change-failure rate / MTTR:

- `hotfix` — urgent fix for a broken/failed change
- `revert` — reverts a bad change
- `rollback` — rolls back a deployment
- `incident` — tied to a production incident

Put the label on the **fix PR**, not the original. `bug` is for general bug reports/fixes
(informational — not counted as a change failure).

**Size labels** — `size/S` · `size/M` · `size/L` · `size/XL` are **auto-applied** by the
`pr-size-label` workflow from the diff size; you don't add them yourself. Smaller PRs review faster
— aim for `size/S`/`size/M`, and split `size/L`/`size/XL` when you can.

## Branches

Name branches with the Jira key so **GitHub for Jira** auto-links the branch (and its commits / PR)
to the ticket, and the "PR merged → Done" automation can fire:

    <type>/CTL-<number>-<short-slug>
    e.g. feat/CTL-1234-google-oidc-callback

Use the same `<type>` set as commits (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`). Always include the `CTL-<number>` — it's what ties the branch,
its commits, and the PR back to the ticket.

## Jira (Atlassian Remote MCP)

This repo ships an MCP config so an agent can work with the **CTL** Jira board
(`https://alankuo9721258.atlassian.net`) while you code — read a ticket's description / acceptance
criteria, create or update issues, transition status (To Do → In Progress → Done), and link PRs.
It connects the **agent** to Jira, not the repo; **no secrets are committed** — each person
authenticates once via browser OAuth.

- **Claude Code** — `.mcp.json` (committed). Run `/mcp`, authenticate `atlassian`, and approve the
  project server when prompted.
- **Cursor** — `.cursor/mcp.json` (committed). Enable it under Settings → MCP and complete the OAuth login.
- **Codex** — remote MCP is user-level; add to `~/.codex/config.toml`, then first use opens OAuth:

      [mcp_servers.atlassian]
      command = "npx"
      args = ["-y", "mcp-remote", "https://mcp.atlassian.com/v1/sse"]

Headless / cron sessions won't have it — that's expected (the scheduled report uses the GitHub API,
not Jira).
