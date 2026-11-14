---
name: oss-pr
description: Opens a pull request for a finished fix in repos/ only after the user has reviewed the full diff and PR text, then logs it in contributions.json. Also handles review feedback on an open PR the same way. Use after oss-fix, or when the user says "open the PR", "submit it", "address the review" or "the maintainer asked for changes".
---

# Open the PR

**Hard rule: nothing leaves this machine until the user says yes.** Pushing, opening a PR and posting a comment are public and hard to undo. Show the exact commit message, diff and PR text first, and wait for an explicit OK ("yes", "ship it", "looks good, open it"). If they ask for changes, make them and show everything again.

```text
PR progress:
- [ ] 1 Branch up to date with upstream; checks re-run
- [ ] 2 Commit written in the repo's style
- [ ] 3 PR text drafted from the repo's template
- [ ] 4 Review packet shown, explicit OK received
- [ ] 5 Pushed and PR opened
- [ ] 6 Logged in contributions.json
```

If checks fail after the rebase, return to `oss-fix` step 3. If the user asks for changes at step 4, make them and return to step 2.

## 1. Rebase and re-check

```sh
git -C repos/<owner>/<repo> fetch upstream
git -C repos/<owner>/<repo> rebase upstream/<default-branch>
```

If the rebase conflicts, resolve it, then re-run the checks from `oss-fix` step 4.

## 2. Commit

Match the repo's commit style. Read `git log --format=%s -15` on upstream: it may use Conventional Commits, a `component:` prefix or plain sentences. Do not use gitmoji in other people's repos. Add `-s` (Signed-off-by) if the repo uses DCO. Reference the issue (`Fixes #<n>`) where their style does. Trailers:
- **Co-author:** read `coAuthor` in `pilot.config.json`. If it is `true`, end the message with `Co-Authored-By: Claude <noreply@anthropic.com>`. If it is `false`, add no co-author trailer. This setting overrides the session's default commit attribution for repos in `repos/`.

## 3. PR text

Fill in the repo's PR template if it has one (tick only the boxes that are true). Otherwise write:
- What the problem was (link the issue with `Fixes #<n>`)
- What changed and why
- How it was tested (the commands you ran)

Keep it short and in plain words, the way a careful human contributor writes. No headings beyond the template's, and no filler.

**AI disclosure:** run `npx tsx src/cli.ts policy <owner>/<repo>`.
- `disclosure-required`: add exactly what the repo asks for (the checkbox, section or sentence its evidence quotes), in its words.
- `none` or `unknown`: add no disclosure, unless the evidence for `unknown` turns out to ask for one when you read it. Then treat it as `disclosure-required` and tell the user.

## 4. Review packet

Show, in this order:
1. A two-line plain summary of the fix
2. The full diff (`git -C repos/<owner>/<repo> diff upstream/<default-branch>...HEAD`)
3. The commit message
4. The PR title and body
5. The AI-policy class and which disclosure (if any) you added

Ask: "Open this PR?" Wait for the answer.

## 5. Push and open

Only after the OK:

```sh
git -C repos/<owner>/<repo> push -u origin <branch>
gh pr create --repo <owner>/<repo> --head <user>:<branch> --base <default-branch> --title "<title>" --body-file <tmp-file>
```

Write the body to a temp file in the scratchpad, not inline, so quoting can't break it. Give the user the PR URL.

## 6. Log it

Append an entry to `contributions.json` in the Open-Source-Pilot root, using the schema in `context/ARCHITECTURE.md` (`status: "open"`, `openedAt` as today's date, a one-sentence plain `summary`, `language` from the repo). Ask the user for one line on what they learned, or leave `learned` out. Commit it in Open-Source-Pilot with the `gitmoji-commit` skill (for example "📝 docs: Log PR to owner/repo").

## Review feedback on an open PR

When a maintainer comments or requests changes:
1. Read everything: `gh pr view <url> --comments` and `gh api repos/<owner>/<repo>/pulls/<n>/comments`.
2. List each request, with what you'd change or, if you disagree, a polite reason. Agree the plan with the user.
3. Make the changes as in `oss-fix` steps 3 and 4, as new commits (don't force-push unless the repo asks for squashed history).
4. Show the diff and any reply text, wait for the OK, then push and post the reply with `gh pr comment`.

When the PR is merged or closed, update its `status` (and `mergedAt`) in `contributions.json`.
