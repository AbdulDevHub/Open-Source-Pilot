---
name: oss-fix
description: Fixes a claimed open source issue inside its fork under repos/. Sets up the project the way its docs say, reproduces the problem, makes the smallest fix in the project's own style, and runs the project's own tests and linters until they pass. Use after oss-claim, or when the user says "fix this issue", "work on the issue" or "continue the fix" for a repo in repos/.
---

# Fix the issue

Make a fix a maintainer would merge without asking for changes: small, in their style, tested by their tools. Work only inside `repos/<owner>/<repo>`, on the `fix/...` branch.

**Rules that matter most**
- Follow the target repo's rules over this workspace's: its `CONTRIBUTING`, `AGENTS.md`/`CLAUDE.md`, formatter, lint config and test layout. The user's global style preferences do not apply to other people's code.
- Change only what the issue needs. No drive-by refactors, renames, reformatting or dependency bumps. A small diff gets merged; a sprawling one gets questions.
- Never push, comment or open a PR from this skill. That is `oss-pr`, behind the user's review.

```text
Fix progress:
- [ ] 1 Project builds and its tests run on the clean branch
- [ ] 2 Problem reproduced (failing test, or exact steps)
- [ ] 3 Fix made
- [ ] 4 Repro now passes; the project's tests, lint and typecheck pass
- [ ] 5 Explanation written for the user
```

If a check in step 4 fails, return to step 3. If the fix grows past what the issue asked for, stop and check with the user.

## 1. Set up

Follow the repo's documented setup (README, CONTRIBUTING, `Makefile`, `package.json` scripts, `justfile`, CI workflow files). Use their package manager and versions. On this Windows machine Python runs through `uv` (`uv run`, `uv venv`), never plain `pip` or `python`. Run the relevant part of their test suite once on the clean branch, so failures you didn't cause are known before you start. Note them. If setup needs something you can't get (a service, a secret, hardware, an OS), tell the user what is missing and stop.

## 2. Reproduce

Prefer a failing test in the repo's existing test style and location. If the issue isn't testable that way (docs, UI, build config), write down exact steps and the current wrong output. Done when you can show the problem happening.

## 3. Fix

Trace the input end to end before deciding the fix is done. A tool option can be dropped by any layer between the caller and the code that uses it, such as a server allowlist or an argument normaliser, so test it at the outermost layer the issue describes. Read the surrounding code and match its patterns, naming and error handling. If the issue's own suggestion is wrong or there are two reasonable approaches, pause and tell the user which you'd pick and why before writing much. For hard bugs, raise the effort level.

## 4. Verify

Run the reproduction, then the project's tests for the touched area, its linter or formatter, and its typecheck, as CI would. If something fails, fix it and run again. Only move on when everything that passed on the clean branch still passes. Then check the diff with `git -C repos/<owner>/<repo> diff`: every changed line should be needed.

## 5. Explain

Give the user a short write-up they could defend in review:
- **Cause:** one or two sentences on why the bug happened.
- **Fix:** what changed and why this approach.
- **Proof:** the test or steps that now pass, and the commands you ran.
- **Likely reviewer questions:** one or two, each with an answer.

Then hand off to `oss-pr`.
