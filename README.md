# Open Source Pilot: Find and Land Good First Issues with Claude Code

## Project Overview

Finding a good first issue is the hard part of contributing to open source. Many are already claimed, sit in inactive repos, or never get reviewed. Open Source Pilot scores open issues across GitHub by how likely a fix is to be merged. It looks at how fast maintainers reply, whether newcomers' PRs actually get merged, and whether anyone has already claimed the issue. Repos that don't accept AI-assisted contributions are left out.

Once you pick an issue, Claude Code walks through the rest: fork, claim, fix, run the project's own tests, and open the PR. Nothing is pushed until you've reviewed it. Every PR goes into a contribution log, which feeds a small public page of your open source work.

> Status: the finder, the skills and the digest Action work. The showcase page is not built yet. See `context/PROGRESS_TRACKER.md`.

## How it works

1. **Find**: `npm run find` ranks fresh issues. The **Open source picks** Action posts the same list as an issue in this repo. It runs on demand; uncomment the schedule in `.github/workflows/digest.yml` for a daily digest.
2. **Claim and fix**: project-local Claude Code skills (`oss-find`, `oss-claim`, `oss-fix`, `oss-pr`) handle the loop inside this folder, so your global skills stay untouched. Say "find me an issue" in Claude Code here to start.
3. **Review**: you see the full diff and PR text before anything is pushed or posted.
4. **Track**: every PR goes into `contributions.json`, and the Action keeps each one's status (open, merged, closed) up to date. A GitHub Pages showcase built from it is planned.

## Setup

Needs Node 22+ and the GitHub CLI (`gh auth login`).

```sh
npm install
npm run find
npx tsx src/cli.ts policy owner/repo   # check one repo's AI-contribution policy
```

Edit `pilot.config.json` to set your GitHub user, languages (empty = any), labels, star minimum and whether Claude is listed as a co-author on your commits.
