---
name: get-it-home
description: Drive a PR all the way to merged on main, autonomously. Keeps rebasing onto origin/main, fixing failing tests/CI, force-pushing, and merging (rebase-merge) until the PR is MERGED — never stopping to ask for permission or confirmation. Usage — `/get-it-home` (PR for the current branch), `/get-it-home 123` (PR number), or `/get-it-home claude/some-branch`. If no PR exists for the branch yet, it pushes the branch and opens one first. Only stops early to flag the session 🔴 RED when it is genuinely blocked after repeated attempts.
---

# /get-it-home — get this PR merged, no hand-holding

Your job: take one PR and drive it to **state = MERGED on `main`**. That is the
only success condition. "Tests pass" is not done. "Rebased and green" is not
done. Merged is done.

## Ground rules — read these first

1. **NEVER ask for permission or confirmation.** No AskUserQuestion, no
   "shall I rebase?", no "want me to merge?", no pausing to report progress
   and waiting. Every action in this skill is pre-authorised by the user
   invoking it. If you catch yourself writing a question mark at the user,
   delete it and do the thing instead.
2. **Never give up silently.** Every exit from this skill is one of exactly
   two states: ✅ MERGED, or 🔴 RED (see escalation below). There is no
   "I made some progress, let me know how you'd like to proceed."
3. **Scope is the one PR.** Fixes you push go to the PR's branch only. Never
   push to `main`, never touch other branches, never revert other people's
   commits on `main`. If getting home would require any of that, that's a
   🔴 RED, not a judgement call.
4. This repo merges **rebase-only** (no merge commits, no squash), and the
   merge button only unlocks when the branch is rebased on the latest `main`.
   Work with that: rebase + force-push-with-lease is the standard move here,
   not an exceptional one.

## Resolve the target

- `/get-it-home` with no args → the PR whose head is the current branch
  (`git branch --show-current`, then find the open PR for it).
- A number → that PR.
- A branch name → the open PR for that branch.
- **No PR exists for the branch?** Push it (`git push -u origin <branch>`)
  and open the PR into `main` yourself, then continue. Opening the PR is part
  of getting it home, not a question to ask.
- PR already merged/closed → report that and stop; nothing to do.

Cloud/web sessions: use the GitHub MCP tools (`mcp__github__*`) for all PR
state, CI status, logs, and the merge itself. Local sessions: `gh` CLI is
fine. Everything below is written tool-agnostically.

## The loop

Repeat until merged. Track a round counter — it feeds the escalation rule.

### 1. Sync with main

```bash
git fetch origin main
git rev-list --count HEAD..origin/main
```

If the branch is behind at all:

```bash
git rebase origin/main
git push --force-with-lease -u origin <branch>
```

- Rebase conflicts: resolve them yourself. Read both sides, keep the intent
  of BOTH changes (the branch's change applied on top of main's current
  state) — never resolve by discarding main's side wholesale; that's the
  silent-revert failure mode the rebase-only rule exists to prevent. If a
  conflict is genuinely ambiguous (both sides rewrote the same logic to do
  different things and the right merge isn't inferable from the code, tests,
  or PR description), that's a 🔴 RED with the conflict hunks in the report —
  don't guess on contested logic, and don't ask mid-loop either.
- `--force-with-lease` rejected: someone else pushed to the branch. Fetch,
  re-rebase on top of the new head, try once more.

### 2. Get the tests green

Check CI on the PR head (checks/status via the GitHub tools, or
`gh pr checks`).

- **CI pending** → wait for it to finish, then re-read. Poll the checks API
  on a slow cadence (roughly every 1–3 minutes); don't busy-loop, and in a
  remote session use the environment's wait/monitor mechanism rather than
  raw `sleep` where one exists. CI is the arbiter of green — don't substitute
  a local full-suite run for it.
- **CI failing** → pull the failed job logs, find the actual failure,
  reproduce it locally with the narrowest command that shows it
  (`cd server && node --test test/<file>.test.js`, or
  `npm --prefix app test`), fix it, commit with a message that names the
  failure, push, and go back to step 1 (main may have moved while you
  worked).
  - Fix the code when the code is wrong; fix the test when the test encodes
    the old behaviour and the PR's new behaviour is the intent. The PR
    description tells you which.
  - Keep the repo's test rules: new behaviour needs its assertion updated,
    not deleted. Deleting/skipping a failing test to force green is only
    acceptable with a `// TODO(...)` naming the cause — and if you're
    reaching for that on a test the PR didn't touch, treat it as a smell.
  - Flaky-looking failure (unrelated to the diff, passes locally)? Re-run
    the failed jobs once. If it fails the same way twice, it's real —
    diagnose it.
- **CI green and branch up to date with main** → step 3, immediately.

### 3. Merge it

Merge with the **rebase** method (`merge_method: "rebase"` /
`gh pr merge --rebase`). Do not ask first — merging is the entire point of
this skill.

- Merge rejected because the branch fell behind between your check and the
  merge (main moved again)? Not an error — increment the round counter and
  go back to step 1.
- Merge blocked by a required review or another branch-protection rule that
  no amount of rebasing/fixing can satisfy from this session → 🔴 RED.

### 4. Confirm and clean up

Re-read the PR: state must be MERGED. Then delete the remote branch (if
GitHub didn't auto-delete), and locally:

```bash
git checkout main && git pull origin main
git branch -D <branch>
```

Report in one short message: PR link, merge commit, how many
rebase/fix rounds it took, and anything you fixed along the way (one line
per fix). That's the ✅ exit.

## 🔴 RED — flagging the session when it desperately needs help

Escalating is the ONLY alternative to merging. Go red when — and only when —
one of these hard stops is hit:

- **3 rounds of fixes for the same failure** and it still fails the same way.
- **6 total loop rounds** without reaching the merge (main is moving faster
  than you can rebase, or failures keep multiplying).
- **A rebase conflict you can't resolve without guessing** on contested logic.
- **CI infrastructure is broken** (jobs erroring before tests run, runner
  outages) and a re-run didn't clear it.
- **Branch protection requires something this session can't produce**
  (e.g. a human review).
- **The fix genuinely requires touching `main` or another branch directly.**

When you go red:

1. **Make it loud.** If a push-notification tool is available in the session
   (e.g. `PushNotification`), send one: title `🔴 get-it-home blocked: PR #<n>`,
   body = the one-line reason. Don't skip this in remote sessions — the user
   is not watching the terminal.
2. **End the turn with a red report** as the final message, in exactly this
   shape so it's scannable from a notification preview:

   ```
   🔴 BLOCKED — /get-it-home PR #<n> needs you.

   Stuck on: <one sentence — the specific blocker>
   Tried: <the rounds/attempts, one line each>
   State: <branch rebased? CI status? anything half-done left on the branch>
   To unblock: <the single most useful thing the user can do>
   ```

3. **Leave the branch in a clean, pushed state** before reporting — no
   uncommitted mess, no unpushed fixes, no half-applied conflict resolution.
   Red means "I need a human decision", not "I made a mess and left".

Do NOT go red for things you can fix: ordinary test failures, ordinary
conflicts, main moving underneath you, a flaky job. Those are the loop.
