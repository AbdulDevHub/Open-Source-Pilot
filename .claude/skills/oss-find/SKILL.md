---
name: oss-find
description: Finds open source issues worth working on by running Open-Source-Pilot's ranker, then presents the best picks with why each scored well and any AI-policy flag. Use when the user asks for an issue, a good first issue, something to contribute to, "what should I work on", or wants today's picks or the digest explained.
---

# Find an issue

Run the ranker, show the best picks, and help the user choose one. This skill only reads: it never forks, comments or claims.

## Steps

1. **Run the ranker** from the Open-Source-Pilot root (it takes about 75 seconds and uses GitHub GraphQL quota, so run it once per request):

   ```sh
   npx tsx src/cli.ts find --json
   ```

   It prints `{ generatedAt, top: RankedIssue[], excludedCount }`. Each entry has `issue` (repo, number, title, url, labels, createdAt), `repo` (stars, language, medianResponseHours, outsideMergeRate, outsideMerged90d, ciState, policy) and `score` with its `breakdown`. If it fails with "No GitHub token", ask the user to run `! gh auth login`.

2. **Skip what the user already has.** Drop issues whose URL is already in `contributions.json`, and issues in repos the user said to avoid.

3. **Show at most 8 picks** as a numbered list. For each give the score, `owner/repo#number`, the title, the URL, the language and one plain line on why it ranks well, for example "maintainers reply in ~5h, 86% of outside PRs merged". Add the flag when it applies:
   - `disclosure-required`: "this repo asks you to disclose AI help in the PR".
   - `unknown`: "has AI rules worth reading first", and quote `repo.policy.evidence[0]`.

4. **Help the user choose.** Recommend one pick with a single reason, weighing how well-scoped the issue looks against the score. Then ask which one they want. When they pick, hand off to the `oss-claim` skill with the issue URL.

## Filters on request

If the user asks for a language, a topic or fewer big repos, edit `pilot.config.json` for that run (`languages`, `minStars`, `maxRepos`), run step 1 again, and say what you changed. Put the setting back afterwards unless they ask to keep it.
