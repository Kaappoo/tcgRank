# 1. Effect services behind TanStack Start server functions

**Status:** accepted

## Context

The backend needs typed errors (not found, forbidden, invalid state), testable data access and a single place to run cross-cutting concerns (auth, logging, tracing). TanStack Start's `createServerFn` is the transport.

## Decision

- Business logic lives in Effect 4 services (`Context.Service` + `Layer`) under `src/server/*/service.ts`. Services depend on `Db` (Drizzle over libSQL/Turso) and read the signed-in user from the optional `CurrentUser` service.
- Server functions are thin: validate input with the shared Zod schema, then `runServerEffect(Service.use(...))`.
- `runServerEffect` (`src/server/effect/run.ts`) provides `CurrentUser` from the better-auth session, runs on one `ManagedRuntime`, and maps tagged errors: `NotFound` → router `notFound()`, others → HTTP status + message.
- Zod validates anything a user types (shared by forms and server functions). Effect Schema models domain values and typed errors.

## Consequences

- Services are tested with `@effect/vitest` against a real, migrated SQLite file per test (`Db.layerTest`) — no mocks of Drizzle.
- Time comes from Effect's `Clock`, randomness from `Random`, so pairing and the match clock are deterministic in tests.
