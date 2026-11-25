# GitHub

**Why.** GitHub runs the tests on every change, and Vercel deploys from it.

## What the agent does

- A repository of its own: creates a private repository with the GitHub tools (`create_repository`, private, under the organisation the person names), then `git remote add origin https://github.com/<owner>/<repo>.git && git push -u origin main`.
  With the GitHub CLI instead: `gh repo create <owner>/<repo> --private --source . --remote origin --push`.
- In-repo (the app is a folder of an existing repository, `new --in-repo`): commits it with its workflows (`.github/workflows/app-test.yml` and `app-smoke.yml` at the repository's root, scoped to the folder) on a branch, opens a pull request, and the app's tests run on it.
- Typecheck and tests pass before the first push: `npm run typecheck` (it enforces the rule that the dashboard sees everything) and `npm test` (unit tests; the backend tests need the local Supabase stack: the app's `AGENTS.md`).
- Optionally protects `main` so changes arrive through pull requests with the Tests check green.

## What is the person's

- Nothing, unless it goes under an organisation the agent can't reach: then add the agent's account, or create an empty repository on github.com (no README) and say its name.

## How to check it

- `git remote get-url origin` names the repository, and the Tests workflow runs on the first pull request.
