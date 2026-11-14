---
name: oss-claim
description: Gets a chosen GitHub issue ready to work on. Checks it is still free, reads the repo's contributing and AI rules, forks and clones into repos/, creates a branch, and posts a claim comment only when the repo asks for one and the user approves. Use when the user picks an issue (by its number in the list, "claim this issue", or an issue URL to work on) or after oss-find.
---

# Claim an issue

Turn an issue URL into a fresh branch in a local fork, ready for `oss-fix`.

**Hard rule:** a comment on someone else's issue is public. Show the exact text and wait for the user's OK before posting it.

**Practice or real?** If the user calls it a practice run, test or dry run, post nothing and stop the whole flow at the `oss-pr` review packet. Keep practice cheap: prefer a small repo, and skip the slow full-repo gates.

```text
Claim progress:
- [ ] 1 Issue still free
- [ ] 2 Rules read and summarised
- [ ] 3 Fork cloned into repos/<owner>/<repo>
- [ ] 4 Branch created from the latest upstream default branch
- [ ] 5 Claim comment posted (only if the repo asks) or skipped
```

If step 1 or 2 turns up a blocker (taken, banned, needs a CLA the user won't sign), stop and return to `oss-find`.

## 1. Check the issue is still free

```sh
gh issue view <url> --json state,assignees,comments,title,body,labels
```

Stop and tell the user if it is closed, assigned, has an open linked PR, or a comment from the last 14 days says someone is working on it. Offer to go back to `oss-find`.

## 2. Read the rules

Read these from the upstream repo, as far as they exist: `CONTRIBUTING*`, `AI_POLICY*`, the PR template, `AGENTS.md` or `CLAUDE.md`, and the README's contributing section. Use `gh api repos/<owner>/<repo>/contents/<path> --jq .content | base64 -d`, or read them after cloning. Also run:

```sh
npx tsx src/cli.ts policy <owner>/<repo>
```

If it says `banned`, stop: the user does not contribute to repos that ban AI help. Then give the user a summary of at most 6 bullets: how to set up and test, the commit style (Conventional Commits? DCO `Signed-off-by`? a CLA?), whether you must be assigned before starting, the AI-policy class and what it asks for, the setup cost (repo size from `gh repo view --json diskUsage`, monorepo build steps), and anything unusual. A large monorepo can take 15+ minutes to install and build before the first test runs, so say so before cloning.

## 3. Fork and clone

```sh
gh repo fork <owner>/<repo> --clone=false
gh repo clone <user>/<repo> repos/<owner>/<repo>
```

`<user>` is `githubUser` in `pilot.config.json`. `gh repo clone` on a fork adds the `upstream` remote. If `repos/<owner>/<repo>` already exists, reuse it and run `git -C repos/<owner>/<repo> fetch upstream`.

## 4. Create the branch

```sh
git -C repos/<owner>/<repo> fetch upstream
git -C repos/<owner>/<repo> switch -c fix/<number>-<short-slug> upstream/<default-branch>
```

Find `<default-branch>` with `gh repo view <owner>/<repo> --json defaultBranchRef --jq .defaultBranchRef.name`. Never edit the clone's default branch directly.

## 5. Claim comment, only when needed

Post a comment only if the contributing guide or a maintainer asks contributors to be assigned or to say they are working on it. Otherwise skip it: an unneeded "can I work on this?" is noise, and a PR is the claim. When it is needed, draft one short, natural sentence, for example "I'd like to take this one. I'm planning to <one-line approach>." Show it to the user, and after their OK post it:

```sh
gh issue comment <url> --body "<text>"
```

Then hand off to `oss-fix`, passing the clone path, branch and rules summary.
