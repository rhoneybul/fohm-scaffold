# Branch protection: rebase only

`main` stays linear: every pull request is rebased onto the current tip of `main` before it lands, and merge commits are not allowed.
This stops the merge-overwrite failure, where a branch merges an old `main` into itself, is merged back, and silently reverts newer code.
It is the rule Naz and Etapa run on.

## The rule, in two settings

1. **A ruleset on `main`**, enforced by GitHub: linear history; the branch up to date before merging; a pull request with Rebase as the only merge method; the `All tests` check green (`.github/workflows/test.yml`); no force pushes or deletion.
2. **The merge buttons**: rebase merging on, merge commits off, squash merging off, head branches deleted automatically.

The only way to land a change is then: rebase onto the latest `main`, push, let `All tests` go green, Rebase and merge.
The `/get-it-home` skill (`.claude/skills/get-it-home/`) drives a pull request through that loop on its own.

## How to apply it (the person's: it needs admin rights, which an agent's GitHub tools don't have)

1. Repository → Settings → Rules → Rulesets → New ruleset → Import a ruleset → choose `.github/rulesets/main-rebase-only.json` → Enforcement Active → Create.
2. Repository → Settings → General → Pull Requests: untick Allow merge commits and Allow squash merging, tick Allow rebase merging and Automatically delete head branches.

With the GitHub CLI, signed in as an admin:

```bash
gh api -X POST repos/<owner>/<repo>/rulesets --input .github/rulesets/main-rebase-only.json
```

```bash
gh api -X PATCH repos/<owner>/<repo> -F allow_merge_commit=false -F allow_squash_merge=false -F allow_rebase_merge=true -F delete_branch_on_merge=true
```

## The required check must always report

`All tests` runs on every pull request into `main`, with no path filters: a required check that is skipped never reports, and the pull request waits for it forever.
Add a new test job to `needs:` on `all-tests` so it gates merges too.
When the app lives in a folder of a bigger repository (`new --in-repo`), its workflow is filtered to the folder: require the repository's own gate, and keep the app's job in it.
