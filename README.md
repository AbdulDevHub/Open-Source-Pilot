# Open Source Pilot: Find and Land Good First Issues with Claude Code

## Project Overview

Finding a good first issue is the hard part of contributing to open source. Many are already claimed, sit in inactive repos, or never get reviewed. Open Source Pilot scores open issues across GitHub by how likely a fix is to be merged. It looks at how fast maintainers reply, whether newcomers' PRs actually get merged, and whether anyone has already claimed the issue. Repos that don't accept AI-assisted contributions are left out.

Once you pick an issue, Claude Code walks through the rest: fork, claim, fix, run the project's own tests, and open the PR. Nothing is pushed until you've reviewed it. Every PR goes into a contribution log, which feeds a small public page of your open source work.

> Status: early build. See `context/PROGRESS_TRACKER.md`.

## How it works (planned)

1. **Find**: a daily GitHub Action posts a ranked digest of fresh issues as an issue in this repo.
2. **Claim and fix**: project-local Claude Code skills (`oss-find`, `oss-claim`, `oss-fix`, `oss-pr`) handle the loop inside this folder, so your global skills stay untouched.
3. **Review**: you see the full diff and PR text before anything is pushed.
4. **Showcase**: `contributions.json` renders as a GitHub Pages site.

## Setup

```sh
npm install
npm run find
```

Edit `pilot.config.json` to set your GitHub user, languages (empty = any), labels and whether Claude is listed as a co-author.
