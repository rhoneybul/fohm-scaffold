# GitHub and its Actions

**Why.** GitHub runs the tests on every change, guards `main`, builds the store apps, and Vercel deploys from it.
Every app gets the same machinery Naz and Etapa run on, from the template: nothing here is optional.

## What the template brings

- `.github/workflows/test.yml`: typecheck, every test and the database tests on each pull request, behind one `All tests` check (Naz's gate).
- `.github/workflows/smoke.yml`: the live site checked after each production deploy.
- Publishing is not GitHub's: an Expo workflow in the app (`.eas/workflows/publish.yml`), run by `scripts/release.ts` from a Claude session ([testflight.md](testflight.md)), so no repository holds an Expo token.
- `.github/rulesets/main-rebase-only.json` and `docs/branch-protection.md`: `main` only through a rebased pull request with `All tests` green.
- `.github/pull_request_template.md`: what and why, how it was checked, decisions taken, and the `Template:` line the daily port-back task reads.
- `.claude/skills/get-it-home/`: drives a pull request to merged (rebase onto `main`, fix CI, Rebase and merge), as Naz and Etapa do.

## What the agent does

- A repository of its own: creates a private repository with the GitHub tools (`create_repository`, private, under the owner the person names), then `git remote add origin https://github.com/<owner>/<repo>.git && git push -u origin main`.
  With the GitHub CLI instead: `gh repo create <owner>/<repo> --private --source . --remote origin --push`.
- In-repo (the app is a folder of an existing repository, `new --in-repo`): commits it with its workflows at the repository's root, scoped to the folder, on a branch, opens a pull request, and the app's tests run on it.
- Typecheck and tests pass before the first push: `npm run typecheck` (it enforces the rule that the dashboard sees everything) and `npm test`.
- From then on, every change ships the same way: a branch, a pull request opened at once with the template filled in, `All tests` green, rebased onto `main`, Rebase and merge (`/get-it-home`).
- Tags each release (`app-v1.2.0`) as `scripts/release.ts` pushes it.

## What is the person's

These need admin rights, which an agent's GitHub tools don't have:

- **Protect `main`**: Settings → Rules → Rulesets → New ruleset → Import a ruleset → `.github/rulesets/main-rebase-only.json` → Active → Create.
- **The merge buttons**: Settings → General → Pull Requests: untick Allow merge commits and Allow squash merging; tick Allow rebase merging and Automatically delete head branches.
- **Secrets and variables**, Settings → Secrets and variables → Actions:
  - No `EXPO_TOKEN`: the Expo token lives in the Claude environment ([accounts.md](accounts.md)).
  - Variable `SMOKE_URL`: the live site's address, once it's deployed (for Smoke).
  - Nothing else: the App Store Connect key lives in Expo, and the app's keys live in Vercel.
- Under an organisation the agent can't reach: add the agent's account, or create an empty repository (no README) and say its name.

## How to check it

- `git remote get-url origin` names the repository, and the first pull request shows `All tests` running.
- Settings → Rules shows the ruleset Active, and a pull request's merge box offers only Rebase and merge.
- Releases show as `app-v*` tags.
