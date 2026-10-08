# Git workflow

Every change goes through a short-lived branch and a pull request into `main`. Nothing is committed to `main` directly.

## Branches

Name: `<type>/<short-kebab-description>`, branched from the latest `main`.

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

- Title follows the same Conventional Commits format; it becomes the squash commit on `main`.
- Merge with **squash**, so `main` reads as one conventional commit per PR.
- `pnpm typecheck && pnpm test` pass before pushing.
