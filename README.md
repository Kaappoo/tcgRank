# tcgRank

**League night, sorted.** A Pokémon TCG app for local game stores: hosts run Swiss events, players scan a QR code to join, get their opponent and table on their phone, report results and watch the round clock. Every player keeps a profile with match history, stats and a deck library.

## Features

**Hosting**
- Create an event (format, Swiss rounds or auto by attendance, round timer)
- QR code + six-character join code; a full-screen **store screen** for the TV with QR, giant clock and alphabetical pairings
- One-tap pairing: Play! Pokémon points (W3/T1/L0, bye = win), OMW%/OOMW% tiebreakers with the 25% floor, no rematches, fair byes, drops
- Match clock: pause, resume, ±1/+5 minutes; overtime shows the "turn 0 + 3 turns" rule
- Host overrides any result; publish final standings with a podium
- Cancel an event before round 1

**Playing**
- Scan → sign up/in → land back in the event, pick a deck
- Pairing card with opponent, records and table number; live clock synced to the server
- Report best-of-three results in two taps; opponent confirms (or reports the same score)
- Profile: lifetime record, win rate, best finish, results-by-event chart, virtualized match history
- Deck library: paste a PTCG Live/Limitless export, live parsing with legality warnings, card art from the Poké Cards catalog (looked up on save), cover photos, public/private
- Share links unfurl with generated images (WhatsApp, Discord, X) for events and players
- Installable PWA; pairings, decks and profiles stay readable offline

## Stack

| Concern | Choice |
| --- | --- |
| App framework | TanStack Start (Router, Query + persist-client, Virtual, Pacer, Devtools) on Vite 8 + Nitro |
| Backend logic | Effect 4 services, typed errors, `ManagedRuntime` bridge to server functions |
| Data | Drizzle ORM on Turso / libSQL (`file:local.db` locally) |
| Auth | better-auth: email + password, username, magic link (via Resend) |
| Uploads | UploadThing (avatars, deck covers) |
| Share images | satori + sharp (`/api/og/*`) |
| Validation | Zod 4 for user input (forms + server functions), Effect Schema for domain models |
| Offline | Serwist service worker |
| UI | Tailwind 4, shadcn-style components on Base UI, TanStack Charts, lucide |
| Language | TypeScript 7 |
| Tests | Vitest 5 + @effect/vitest (server), jsdom + Testing Library + MSW (client), Playwright (e2e), Storybook 10 |
| Review | fallow, react-doctor, impeccable |
| Agent workflow | Matt Pocock's engineering skills + impeccable in `.claude/skills` |

## Getting started

```bash
pnpm install
cp .env.example .env            # set BETTER_AUTH_SECRET at minimum
pnpm tsx scripts/migrate.ts     # create local.db
pnpm db:seed                    # optional: demo store, 9 players, a finished Cup and a live event
pnpm dev                        # http://localhost:3000
```

Seeded accounts: `oak` (host), `ash`, `misty`, `brock`, … — password `pallet-town-1`.

Without `RESEND_API_KEY` emails are logged to the console; without `UPLOADTHING_TOKEN` image uploads are disabled; without `CARD_CATALOG_URL` decks are saved without card art (run `pnpm tsx scripts/backfill-card-images.ts` once it is set). For production point `DATABASE_URL` / `DATABASE_AUTH_TOKEN` at Turso and set `APP_URL` so QR codes and share images use your domain. On Vercel, `pnpm vercel-build` applies pending migrations before building, on production deploys only (previews skip them).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server with TanStack Devtools (Router, Query, Pacer) |
| `pnpm build` / `pnpm start` | Production build to `.output` (+ service worker) / run it |
| `pnpm typecheck` | TypeScript 7 |
| `pnpm test` | Vitest: `server` (node) and `client` (jsdom + MSW) projects |
| `pnpm test:e2e` | Playwright, desktop + Pixel 7 (own dev server on :3100) |
| `pnpm storybook` | Component workbench |
| `pnpm db:generate` / `db:migrate` / `db:studio` | Drizzle Kit |
| `pnpm review` | fallow + react-doctor + impeccable detect |

> In sandboxed containers Playwright may need `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium`.

## Project map

```
src/
  domain/        pure rules: standings, swiss, match-clock, deck-list, ids (+ tests)
  server/        Effect services (events, decks, profiles), db, auth, email, og, functions/
  shared/        Zod schemas used by forms and server functions
  routes/        file routes; api/ for auth, uploadthing, og images
  components/    ui/ primitives (Base UI) and feature components (+ stories, tests)
  sw.ts          Serwist service worker
e2e/             Playwright specs
docs/adr/        architecture decisions
```

See `CLAUDE.md` for conventions, `PRODUCT.md` / `DESIGN.md` for product and visual direction, and `GLOSSARY.md` for domain language.
