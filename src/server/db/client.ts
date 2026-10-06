import { createClient } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { Config, Context, Effect, Layer } from 'effect'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseError } from '../errors.ts'
import * as schema from './schema.ts'

export type Database = LibSQLDatabase<typeof schema>

export const makeDatabase = (url: string, authToken?: string): Database =>
  drizzle(createClient({ url, authToken: authToken || undefined }), { schema })

export class Db extends Context.Service<
  Db,
  {
    readonly drizzle: Database
    query<A>(run: (db: Database) => Promise<A>): Effect.Effect<A, DatabaseError>
  }
>()('tcgrank/server/db/Db') {
  static readonly make = (database: Database) =>
    Db.of({
      drizzle: database,
      query: (run) =>
        Effect.tryPromise({
          try: () => run(database),
          catch: (cause) => new DatabaseError({ cause }),
        }),
    })

  static readonly fromDatabase = (database: Database) => Layer.succeed(Db, Db.make(database))

  /** Live Turso / libSQL connection configured from the environment. */
  static readonly layer = Layer.effect(
    Db,
    Effect.gen(function* () {
      const url = yield* Config.String('DATABASE_URL').pipe(Config.withDefault('file:local.db'))
      const authToken = yield* Config.String('DATABASE_AUTH_TOKEN').pipe(Config.withDefault(''))
      return Db.make(makeDatabase(url, authToken))
    }),
  )

  /** Fresh, migrated SQLite file per layer build — isolated and fast enough for tests. */
  static readonly layerTest = Layer.effect(
    Db,
    Effect.promise(async () => {
      const dir = mkdtempSync(join(tmpdir(), 'tcgrank-test-'))
      const database = makeDatabase(`file:${join(dir, 'test.db')}`)
      await migrate(database, { migrationsFolder: join(process.cwd(), 'drizzle') })
      return Db.make(database)
    }),
  )
}
