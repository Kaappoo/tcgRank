# Git workflow

Every change goes through a short-lived branch and a pull request into `develop`. Nothing is committed to `develop` or `main` directly.

- `develop` collects finished work. Feature, fix and docs PRs target it.
- `main` is what production deploys (Vercel). It only moves through a **release PR** from `develop`, so it gets one merge per batch of work instead of one per change.

## Branches

Name: `<type>/<short-kebab-description>`, branched from the latest `develop`.

- `<type>` is a Conventional Commits type (below) describing the change.
- The description says what the change does in 2–5 words: `fix/migrate-on-vercel-deploy`, `feat/deck-cover-picker`, `docs/git-workflow`.
- One concern per branch. Unrelated fixes, docs or refactors get their own branch.
- Generated names (`ccr-…`, `claude/…`, random suffixes) are not acceptable. If a session hands you one, work on a properly named branch instead and push that.
- Delete the branch after its PR is merged.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `<type>(<optional scope>): <subject>`

- Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `style`, `revert`.
- Scope is the area touched, when it helps: `events`, `decks`, `auth`, `db`, `deploy`, `ui`.
- Subject: imperative, lower case, no trailing period, ≤ 72 characters.
- Body: why the change was needed and what it does, wrapped at 72.
- Breaking changes: `!` after the type/scope and a `BREAKING CHANGE:` footer.

## Pull requests

- Base branch is `develop`.
- Title follows the same Conventional Commits format; it becomes the squash commit on `develop`.
- Merge with **squash**, so `develop` reads as one conventional commit per PR.

## Releases

- Open a PR from `develop` into `main` when a batch is ready to ship, titled `chore(release): <what the batch delivers>`, with the PRs it carries listed in the body.
- Merge it with a **merge commit**, not a squash. That way `develop` and `main` keep sharing history, and the next release doesn't conflict with the last one.
- Production migrations run on deploy, so a release containing a migration ships that migration.
- `pnpm typecheck && pnpm test` pass before pushing.
