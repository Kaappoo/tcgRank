# tcgRank

Pokémon TCG league app for local stores: hosting, QR join, Swiss pairings, match clock, result reporting, profiles and deck library. Read `PRODUCT.md` (what/who), `DESIGN.md` (visual system) and `GLOSSARY.md` (domain terms) before larger changes.

## Stack

TanStack Start (Router, Query + persist-client, Virtual, Pacer, Devtools) · TanStack Charts · Effect 4 · TypeScript 7 · Drizzle + Turso/libSQL · better-auth (+ username, magic link) · Resend · UploadThing · satori + sharp (OG images) · Zod 4 + Effect Schema · Serwist · Tailwind 4 + shadcn on Base UI · Storybook 10 · Vitest 5 + @effect/vitest · jsdom + Testing Library + MSW · Playwright.

## Commands

```bash
pnpm dev                 # http://localhost:3000 (migrate first: pnpm tsx scripts/migrate.ts)
pnpm typecheck           # tsc (TypeScript 7)
pnpm test                # vitest: server (node, @effect/vitest) + client (jsdom, MSW)
pnpm test:e2e            # playwright (starts its own dev server on :3100 with e2e.db)
pnpm build               # vite build → .output (Nitro) + Serwist service worker
pnpm storybook           # component workbench on :6006
pnpm db:generate         # drizzle-kit migration from src/server/db/schema.ts
pnpm db:seed             # demo store, players, a finished and a live event
pnpm review              # fallow + react-doctor + impeccable detect
```

## Layout

- `src/domain/` — pure rules: standings & tiebreakers, Swiss pairing, match clock, deck-list parser, ids. No IO. Unit-tested.
- `src/server/` — Effect services (`events/`, `decks/`, `profiles/`), `db/`, `auth.ts`, `email/`, `og/`, `functions/` (thin `createServerFn` wrappers), `effect/run.ts` (Effect → server fn bridge).
- `src/shared/schemas.ts` — Zod schemas shared by forms and server-function validators.
- `src/routes/` — file routes (TanStack Router). API routes under `routes/api/`.
- `src/components/ui/` — shadcn-style primitives on Base UI. Feature components in `components/{events,decks,profile,layout}`.
- `e2e/` Playwright, `tests/` client test setup + MSW handlers, `docs/adr/` decisions.

## Conventions

- Business logic goes in an Effect service method (`Effect.fn('Service.method')`), never in a server function or component. Fail with tagged errors from `src/server/errors.ts`.
- Time via `Clock`, randomness via `Random` in Effect code — tests rely on it.
- Server tests use `withDb(Service.layer)` and `asUser(user)` from `src/server/testing.ts` against a real migrated SQLite file.
- Anything rendered on the server and the client must hydrate identically: use `<LocalTime>` for dates, `useHydrated()` for browser-only branches, `referenceNow` for clocks. Submit buttons use `<SubmitButton>`.
- Colours only through tokens (`bg-orange`, `text-paper-dim`, …). No new accent colours; see DESIGN.md "Refused".
- Run `pnpm typecheck && pnpm test` before committing; run `pnpm review` for UI work.

## Agent skills

### Git workflow

Branches are `<type>/<kebab-description>` off `main` (e.g. `fix/migrate-on-vercel-deploy`), commits and PR titles follow Conventional Commits, PRs are squash-merged. Never use generated branch names (`ccr-…`, `claude/…`). See `docs/agents/git-workflow.md`.

### Issue tracker

Issues live in GitHub Issues for this repo (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Installed skills

- `.claude/skills/` — Matt Pocock's engineering skills (`tdd`, `to-spec`, `to-tickets`, `implement`, `code-review`, `diagnosing-bugs`, `improve-codebase-architecture`, `grill-me`, …) and **impeccable** (design: `/impeccable critique|audit|polish|animate …`).
