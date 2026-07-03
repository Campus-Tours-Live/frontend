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

# Agent skills — Codex & Claude (frontend)

This repo's skills work for **both Codex and Claude Code**. They come from the
`claude-code-workflows` marketplace (`wshobson/agents`, which ships dual Codex + Claude plugin
manifests) plus `ui-ux-pro-max`.

**Auto-install (both agents).** `.claude/hooks/ensure-plugins.mjs` installs and keeps updated
the enabled plugins for whichever CLI you have — `claude` and/or `codex`. It runs on
`npm run dev` (`predev`), via the launcher, and — for Claude only — on every session
(SessionStart hook). Install everything now with `npm run update:skills` (from
`campus-tours-live`).

> **Codex specifics.** Codex has no per-repo SessionStart auto-install, so the trigger for Codex
> is running the repo (`npm run dev` / launcher) or `codex plugin add <name>@claude-code-workflows`.
> `ui-ux-pro-max` is a built-in Codex **skill** (already available). Process skills
> (`superpowers:*`) are Claude-only — in Codex, follow the same discipline (plan before coding,
> TDD, systematic debugging) with its built-in flow.

**Which skill for which situation, and the cross-repo rules, live in `CLAUDE.md`** — Codex reads
`CLAUDE.md` as well. The domain skill names there (`frontend-mobile-development`,
`javascript-typescript`, `ui-design`, `unit-testing`, `security-scanning`,
`comprehensive-review`) are identical for both agents; only the `superpowers:*` rows are
Claude-specific.
