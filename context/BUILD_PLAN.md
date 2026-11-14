# Build Plan

> Purpose: the approved, phased build plan for Open-Source-Pilot (from the 2026-11-13 planning session).
> Work through the Steps in order; each phase must work on its own before the next starts.
> Treat Decisions as settled unless the user reopens them. Mark phase progress in PROGRESS_TRACKER.md, not here;
> edit this file only when the plan itself changes.

## Plan: Open-Source-Pilot

## Context
You want an easy, repeatable way to land small open source contributions, written by Claude and reviewed by you. Right now that means hunting for issues by hand and installing skills globally. The real goal is **merged PRs**, a visible track record of shipped open source work, and proof that Claude plus a human reviewer can ship in any stack. The folder (`Code Vault/Opensoure Repo`, currently empty) becomes a public repo: personal first, made shareable later. It is built over several sessions, so agent context files come first.

## Terms
- **small/easy issue**: an open issue labelled `good first issue` or `help wanted`, unassigned, with no linked PR and no "I'll take this" comment, in an active repo (a merge within the last ~30 days), fixable in an afternoon. Any language.
- **contribute**: a merged PR. The flow covers finding, claiming, fixing, review by you, opening the PR and handling feedback.
- **external repos**: your forks, cloned into a gitignored `repos/` folder. The public repo never contains other people's code.
- **GitHub Actions**: a daily digest of ranked issues, plus a contribution status refresh and the Pages deploy.
- **for other people**: personal first. Public but unpolished for now, with a template-ready config later.

## Decisions
- **Engine: one TypeScript CLI** (Node, Octokit and GraphQL, run with `tsx`). The Action and the skills both call it, so rankings stay consistent and cost no Claude usage.
- **No language restriction**: `pilot.config.json` `languages: []` means all languages. Filtering is optional.
- **Merge-likelihood score** from: median maintainer first-response time, first-time contributors merged in the last 90 days, recency of the last merge, default-branch CI health, issue freshness, and whether the issue is unclaimed.
- **AI policy check** (reads `CONTRIBUTING*`, `AI_POLICY*`, `CODE_OF_CONDUCT*`, `.github/` docs, and the PR template). Each repo is classified `banned` / `disclosure-required` / `none`:
  - `banned` repos are dropped from results.
  - For `disclosure-required` repos, the PR skill adds the disclosure line those repos ask for, and only there.
  - For `none` repos, nothing is disclosed.
- **Co-author toggle**: `pilot.config.json` `coAuthor: true|false` controls whether Claude adds a `Co-Authored-By` trailer to commits and PRs in external repos. The project AGENTS.md states that this setting overrides the global attribution rule.
- **PR gate**: Claude explains the fix and shows the full diff and PR text. It pushes and runs `gh pr create` only after your explicit OK. Review feedback is handled the same way.
- **Project-local skills** live in `.claude/skills/` (loaded only in this folder, so the global list stays lean). They are authored with `skill-creator-plus`.
- **Showcase site**: a GitHub Pages site (Vite + TypeScript, no framework) rendered from `contributions.json`. It is framed as a neutral "Open source work" portfolio page.
- **Digest delivery**: one rolling GitHub issue in the repo, updated daily, so you get notified.
- **Sharing**: personal first. The config is kept in one file so it can become a template later.

## Assumptions
- `gh` CLI is installed and authenticated as your account. The Action uses the built-in `GITHUB_TOKEN`, and no extra secrets are needed for public search.
- You rename the folder to `Open-Source-Pilot` after this session (renaming the live working folder mid-session is messy).
- Node via the setup in `~/.claude/reference/tools.md`. Package manager: npm unless the reference says otherwise.
- The AI-policy classifier is keyword-based. Anything it can't classify confidently is marked `unknown` and shown to you before you claim the issue.

## Files
- `AGENTS.md`, `context/` (BUILD_PLAN.md, PROGRESS_TRACKER.md, ARCHITECTURE.md): created via `/setup-agent-context`. Includes `Verify:` and `Verify-full:` lines.
- `pilot.config.json`: languages, labels, minStars, maxIssueAgeDays, coAuthor, githubUser, digestSize.
- `src/cli.ts`: entry point (`find`, `policy <repo>`, `refresh-contributions`).
- `src/search.ts`: GitHub search for candidate issues.
- `src/score.ts`: merge-likelihood scoring (pure functions, unit tested).
- `src/policy.ts`: AI-policy detection and classification.
- `src/digest.ts`: renders and upserts the digest issue.
- `src/contributions.ts`: refreshes PR statuses in `contributions.json`.
- `contributions.json`: the contribution log (repo, issue, PR URL, status, dates, summary, what you learned).
- `.claude/skills/oss-find/`: runs `find`, presents the top picks and explains their scores.
- `.claude/skills/oss-claim/`: fork, clone into `repos/`, comment to claim, create a branch.
- `.claude/skills/oss-fix/`: reads the repo's contributing rules, reproduces the bug, fixes it, runs the repo's own tests and linters.
- `.claude/skills/oss-pr/`: review gate, then disclosure (if required), co-author toggle, push, `gh pr create`, and an entry in `contributions.json`.
- `.github/workflows/daily.yml`: cron job that runs `find` and updates the digest, then runs `refresh-contributions` and commits.
- `.github/workflows/pages.yml`: builds `site/` on pushes to main and deploys to GitHub Pages.
- `site/`: Vite + TS portfolio page that reads `contributions.json`.
- `.gitignore`: `repos/`, `node_modules/`, `.env`.
- `README.md`: Title Case title, what it is, how to use it.

## Steps (each phase works on its own)
1. **Scaffold and context**: `git init`, run `/setup-agent-context` with this plan as `context/BUILD_PLAN.md`, add package.json, tsconfig, vitest and .gitignore. *Check: `Verify:` passes on an empty test.*
2. **Ranker CLI**: search, score and policy, plus `npm run find`. *Check: prints a ranked top 10 with a score breakdown, banned repos are absent, and unit tests cover the score and policy classification.*
3. **Skills workflow**: the four `oss-*` skills, written and audited with `skill-creator-plus`. *Check: a dry run on one real issue reaches the review gate without pushing anything.*
4. **Daily Action**: `daily.yml`. *Check: `gh workflow run daily.yml` creates or updates the digest issue.*
5. **Showcase site and Pages**: `site/` and `pages.yml`. *Check: the deployed page renders the entries in `contributions.json`, and `ui-checker-agent` passes at desktop and phone widths.*
6. **First real contribution**: use the full loop on one issue. *Check: the PR is opened after your OK and appears on the site.*
7. **Ship**: README, repo description ("🧭 …"), gitmoji commits, push, enable Pages.

## Verification
- `Verify:` `npx tsc --noEmit && npx vitest run`
- `Verify-full:` the above plus `npm run build --prefix site`
- End to end: `npm run find` (check the ranking output), a skill dry run up to the review gate, `gh workflow run daily.yml`, and `ui-checker-agent` on the Pages URL.

## Outside check
**3 merged PRs within ~2 months (by 2027-01-13)**, tracked as the merged/opened ratio in `contributions.json`. If the merge rate stays under 50% after 4 PRs, re-weight the score signals.
