# Progress Tracker

> Purpose: where the project stands, so a new session can pick up exactly where the last one stopped.
> Update "Current state", "In progress" and "Next steps" after every meaningful change, and add a dated
> session-log entry (newest first). Collapse stale log entries into "Earlier history" instead of deleting them.
> Phase numbers refer to the Steps in `BUILD_PLAN.md`.

## Current state
- Phase 1 done: repo, agent context files, TS/vitest setup, config, empty `contributions.json`.
- Phase 2 done: `npm run find` (and `--json`) ranks live issues in ~75 s over 40 repos; `npx tsx src/cli.ts policy owner/repo` shows a repo's AI-policy class with evidence. 59 unit tests.

## In progress
- Nothing. Phase 3 is next.

## Next steps
- Phase 3: the four `oss-*` skills via `skill-creator-plus`; `oss-find` should call `find --json`.
- Known limits: repo search is `sort:updated`, so results lean to very busy repos; CI is often PENDING (latest commit still running). `unknown` policy repos stay in results with an "[AI policy: check]" flag.
- Rename the folder `Opensoure Repo` → `Open-Source-Pilot` (user, outside a session), then create the GitHub repo.

## Session log
### 2026-11-13 (Phase 2)
- Built search (repo search → batched GraphQL), signals, score, policy, CLI. Switched from issue search to repo search because issue search can't filter by stars and returns mostly tiny repos.
- Tuned the AI-policy classifier against ~20 real CONTRIBUTING files: conditional rules ("don't submit AI code you don't understand") are not bans; "no disclosure required"/"optional" are not disclosure rules; code spans and tables are ignored. Added a beginner-label factor and a per-repo cap (`perRepo`).

### 2026-11-13
- Planned with /idea-quasar. Name: Open-Source-Pilot. Key decisions: TS engine shared by Action and skills, any language, merge-likelihood ranking, skip AI-banned repos, disclose only where required, `coAuthor` toggle, Claude opens PRs only after user review, GitHub Pages showcase from `contributions.json`, personal-first (template later).
- Scaffolded the repo and context files.

## Earlier history
- None yet.
