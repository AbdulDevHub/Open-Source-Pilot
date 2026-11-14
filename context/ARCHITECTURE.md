# Architecture

> Purpose: the folder layout, data flow and data schemas of Open-Source-Pilot, so code lands in the right layer.
> Update it when a module, workflow or schema changes. Planned parts are marked (planned) until they exist.

## Layout
```
pilot.config.json        user settings (the only place to customise)
contributions.json       contribution log; source of truth for site + status refresh
src/cli.ts               entry: find | policy <owner/repo> | refresh-contributions   (planned)
src/search.ts            GitHub search + repo signal fetching (network)            (planned)
src/score.ts             merge-likelihood score, pure                              (planned)
src/policy.ts            AI-policy classifier, pure (text in → class out)          (planned)
src/digest.ts            render + upsert the rolling digest issue                  (planned)
src/contributions.ts     refresh PR statuses in contributions.json                 (planned)
.claude/skills/oss-*     find, claim, fix, pr: the local Claude workflow           (planned)
.github/workflows/       daily.yml (digest + refresh), pages.yml (site deploy)     (planned)
site/                    Vite + TS page that reads contributions.json              (planned)
repos/                   cloned forks of external projects, gitignored
```

## Data flow
1. `find`: search issues (config labels/languages) → fetch repo signals → `policy` drops `banned` → `score` ranks → print (local) or upsert digest issue (Action).
2. Skills: `oss-claim` forks and clones into `repos/<repo>` → `oss-fix` → `oss-pr` (user review gate) → append to `contributions.json`.
3. Daily Action: `refresh-contributions` updates statuses → commit → `pages.yml` redeploys the site.

## AI policy classes
`banned` (dropped) · `disclosure-required` (PR gets the requested disclosure) · `none` · `unknown` (shown to the user before claiming).

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
