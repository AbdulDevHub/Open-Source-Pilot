# AGENTS.md

> Purpose: terse, machine-facing notes for AI coding agents working on Open-Source-Pilot.
> Read this first, then `context/` for depth. After any meaningful change to this project, update this file,
> `context/PROGRESS_TRACKER.md`, and the "Project Overview" section of `README.md` to reflect the current
> state. Do this proactively, without being asked.

## Overview
A workspace for finding, fixing and landing small open source issues with Claude. A TypeScript CLI ranks issues by merge likelihood, project-local skills drive the fix→PR loop, and a Pages site shows the contribution log.

## Tech stack
- Node 22, npm, TypeScript (ESM, strict), `tsx` to run, `vitest` for tests, Octokit (REST + GraphQL)
- `site/`: Vite + TypeScript, no framework, deployed to GitHub Pages
- GitHub Actions (`.github/workflows/`), project-local skills (`.claude/skills/oss-*`)

## Commands
- Install: `npm install`
- Find issues: `npm run find`
- Tests: `npx vitest run`
- Verify: npx tsc --noEmit && npx vitest run
- Verify-full: npx tsc --noEmit && npx vitest run && npm run build --prefix site

## Conventions & constraints
- All user settings live in `pilot.config.json`. Never hard-code languages, labels or the GitHub user.
- `src/score.ts` and `src/policy.ts` stay pure (no network) so they can be unit tested. Fetching lives in `search.ts`.
- AI policy: drop `banned` repos. Add the disclosure the repo asks for **only** on `disclosure-required` repos. Disclose nothing elsewhere.
- `pilot.config.json` `coAuthor` decides whether commits/PRs in external repos (`repos/`) get a `Co-Authored-By` trailer. It overrides the global attribution rule there. Commits to this repo itself follow the normal gitmoji rule.
- `contributions.json` is the single source of truth for the site and the status refresh. Keep the schema in `context/ARCHITECTURE.md` in sync.

## Boundaries
- **Never push, comment on, or open a PR in an external repo without the user's explicit OK** after they've seen the diff and PR text.
- `repos/` holds other people's code (gitignored). Never commit it here, never edit their CI or licence files unless the issue asks for it.
- No secrets in committed files. Local tokens go in `.env` (gitignored).

## Where to look for more
- `README.md`: the plain-language overview
- `context/BUILD_PLAN.md`: the approved phased plan and settled decisions
- `context/ARCHITECTURE.md`: layout, data flow, `contributions.json` schema
- `context/PROGRESS_TRACKER.md`: current state and session log
