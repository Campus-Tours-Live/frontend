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
`description`. The table below tells Claude (and reminds humans) which skill fits which
situation. You can always force one with `/plugin` → the skill's slash command.

> **One-time setup:** the plugins are declared in `.claude/settings.json`
> (marketplace `claude-code-workflows` = `wshobson/agents`, plus `ui-ux-pro-max`).
> The first time you open this repo, accept the workspace-trust dialog so they load.

## Situation → skill

| When you are… | Use this skill |
| --- | --- |
| Planning any new feature / behavior change (think before coding) | `superpowers:brainstorming` |
| Layout, color, typography, visual direction | `frontend-design`, `ui-ux-pro-max` |
| React components / hooks / Server vs Client boundary | `frontend-mobile-development`, `javascript-typescript` |
| Next.js App Router / SSR / data fetching | `frontend-mobile-development` |
| Calling the bff API (types, TanStack Query) | `javascript-typescript` |
| Writing / adding unit & component tests (Jest + Testing Library) | `unit-testing`, `superpowers:test-driven-development` |
| End-to-end UI verification in a real browser | `webapp-testing` |
| Checking security (XSS, dependency CVEs, token storage) | `security-scanning` |
| Debugging (any bug / test failure / unexpected behavior) | `superpowers:systematic-debugging` |
| Self-review before finishing | `comprehensive-review`, `/code-review` |

## ⚠️ Cross-repo observation rules (read before changing frontend)

Frontend changes are rarely safe in isolation. When you touch any of the following,
**you must also check the other two repos**:

- **Changing API calls / data types** → first confirm the matching route in **bff** (`bff`
  is the proxy/aggregation layer; the shape it returns is the source of truth, not backend
  directly). Trace back to the **backend** DTO only if needed.
- **Changing auth / login flow / reading session** → session/cookies are owned by **bff**
  (`SESSION_SECRET`, Google OAuth). The frontend only consumes the session bff gives it — do
  not run OAuth against backend directly. Read bff before changing anything here.
- **Adding a feature that needs backend support** → the coordination order is
  **backend defines the contract → bff adapts → frontend consumes**. If backend/bff don't
  provide it yet, open an issue / align the contract first — don't mock in frontend and merge.

> Rule of thumb: if your change alters "what flows between frontend and bff", it is a
> cross-repo change — at minimum **read** the corresponding bff code (and possibly backend)
> before deciding how to change it. See the "Cross-repo coordination" section in
> `campus-tours-live/CLAUDE.md`.
