# Architecture

> Purpose: the folder layout, data flow and data schemas of Open-Source-Pilot, so code lands in the right layer.
> Update it when a module, workflow or schema changes. Planned parts are marked (planned) until they exist.

## Layout
```
pilot.config.json        user settings (the only place to customise)
contributions.json       contribution log; source of truth for site + status refresh
src/cli.ts               entry: find [--json] | policy <owner/repo> (refresh-contributions planned)
src/types.ts             shared types incl. PilotConfig
src/config.ts            loadConfig() with defaults for newer settings
src/search.ts            the only network layer: repo search + batched GraphQL repo fetch (5 repos/query)
src/signals.ts           pure: raw GraphQL repo/issue nodes → RepoSignals / IssueCandidate
src/score.ts             pure: exclusion filters, weighted 0–100 score, rank, per-repo diversify
src/policy.ts            pure: AI-policy classifier (sentence-level, text in → class out)
src/digest.ts            render + upsert the rolling digest issue                  (planned)
src/contributions.ts     refresh PR statuses in contributions.json                 (planned)
.claude/skills/oss-*     find, claim, fix, pr: the local Claude workflow           (planned)
.github/workflows/       daily.yml (digest + refresh), pages.yml (site deploy)     (planned)
site/                    Vite + TS page that reads contributions.json              (planned)
repos/                   cloned forks of external projects, gitignored
```

## Data flow
1. `find`: repo search (`stars:>=minStars good-first-issues:>0 pushed:<30d sort:updated`, per language if set) → up to `maxRepos` repos → one batched GraphQL fetch per 5 repos gets PR history, CI state, labelled open issues and policy files → `signals` → `score` excludes (archived, AI-banned, <minStars, no merge in 30d, assigned, open linked PR, claimed in comments, too old) and ranks → `diversify` caps `perRepo` → print, `--json` for skills/Action. Repo search results are interleaved round-robin across label/language queries before the `maxRepos` cut.
2. Skills: `oss-claim` forks and clones into `repos/<repo>` → `oss-fix` → `oss-pr` (user review gate) → append to `contributions.json`.
3. Daily Action: `refresh-contributions` updates statuses → commit → `pages.yml` redeploys the site.

## Score (weights sum to 100; unknown signals score 0.5)
responsiveness 25 (median maintainer first reply to outside PRs, 1 at ≤24h → 0 at 14d, log) · mergeRate 20 (outside PRs merged/closed, needs ≥3) · outsideMerges 15 (outside merges in 90d, 10 = full) · beginner 10 (newcomer label like good-first/easy = 1, plain help wanted = 0.3) · activity 10 (last merge ≤3d full → 30d zero) · freshness 10 (issue age vs `maxIssueAgeDays`) · ci 5 (default-branch rollup) · clarity 5 (body length + code block). "Outside" = not OWNER/MEMBER/COLLABORATOR and not a bot.

## AI policy classifier (`policy.ts`)
Reads `POLICY_FILES` (AI policy, CONTRIBUTING variants, PR templates; not README). Sentence-level, after stripping code spans and table rows. Needs an AI term (case-sensitive AI/LLM/GPT, or named tools). Order per sentence: explicit "no disclosure is required / optional" → allowed; disclose/undisclosed/checkbox → disclosure-required; ban verb → banned, unless conditional ("you don't understand", "low-quality", "unreviewed", AI art…) → rules; softer disclosure words (declare, mention, was used) → disclosure-required; welcome/encourage → allowed; other must/should/please → rules.

Repo classes: `banned` (dropped) > `disclosure-required` (PR adds the requested disclosure) > allowed (= `none`) > rules (= `unknown`, flagged "[AI policy: check]") > `none`. Check a repo by hand with `npx tsx src/cli.ts policy owner/repo`.

## `contributions.json` schema
```json
{
  "contributions": [
    {
      "repo": "owner/name",
      "issue": "https://github.com/owner/name/issues/1",
      "pr": "https://github.com/owner/name/pull/2",
      "title": "Short PR title",
      "summary": "One plain sentence on what changed",
      "learned": "Optional: what was learned",
      "language": "TypeScript",
      "status": "open | merged | closed",
      "openedAt": "2026-11-13",
      "mergedAt": null
    }
  ]
}
```
