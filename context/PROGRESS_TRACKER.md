# Progress Tracker

> Purpose: where the project stands, so a new session can pick up exactly where the last one stopped.
> Update "Current state", "In progress" and "Next steps" after every meaningful change, and add a dated
> session-log entry (newest first). Collapse stale log entries into "Earlier history" instead of deleting them.
> Phase numbers refer to the Steps in `BUILD_PLAN.md`.

## Current state: PARKED (since 2026-11-13)
The user is finishing other projects first and will come back when they have time for open source work. Nothing runs automatically: the digest Action is manual-only.

- Phases 1–4 done: config and context files; `npm run find` ranker with AI-policy filter (~75 s, 40 repos); the four `oss-*` skills; `digest.yml` Action (manual `workflow_dispatch`, upserts the "Open source picks" issue and refreshes `contributions.json`). 78 unit tests.
- GitHub: https://github.com/AbdulDevHub/Open-Source-Pilot (public).
- Practice run on reticlehq/reticle#2326. Nothing was posted. A fork exists at AbdulDevHub/reticle. The fix is local and uncommitted in `repos/reticlehq/reticle` on `fix/2326-look-role-text-filter`. It covers the browser filter, plus the server forwarding and the `{ role, text }` normaliser, with tests that fail without the fix. The repo's `pnpm verify` and e2e were not run. If it's still open when resuming, it could become a real PR (claim the issue first; reticle requires a claim comment and DCO sign-off).

## Resume checklist
1. `npm install`, `gh auth status`, then say "find me an issue" in Claude Code here (`oss-find`).
2. For a daily digest, uncomment the `schedule` in `.github/workflows/digest.yml`.
3. Phase 5: the GitHub Pages showcase in `site/`, built from `contributions.json`. Phase 7: ship polish.

## Ideas / known limits
- Ranker: penalise huge monorepos (reticle took ~5 min to install and ~11 min to build) and labels like `tracking`, `size:L`, `epic`.
- Repo search is `sort:updated`, so it leans to very busy repos. CI is often PENDING. Repos with `unknown` policy stay in results with a flag.
- The AI-policy check doesn't read READMEs (too noisy), so a policy that lives only in a README is missed.
- Optional: rename the local folder `Opensoure Repo` → `Open-Source-Pilot`.

## Session log
### 2026-11-13 (Phases 3–4, then parked)
- Wrote the four skills (validator clean). The practice run taught three things: practice runs post nothing, say the setup cost before cloning big repos, and trace an option through every layer (the reticle bug was half in the server).
- Added `find --markdown`, `refresh-contributions`, `digest.yml` and `vitest.config.ts` (vitest was picking up `repos/` test suites). Created the GitHub repo.

### 2026-11-13 (Phases 1–2)
- Planned with /idea-quasar. Key decisions are in BUILD_PLAN.md.
- Switched from issue search to repo search, since issue search can't filter by stars. Tuned the AI-policy classifier on ~20 real CONTRIBUTING files.

## Earlier history
- None yet.
