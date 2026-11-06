import './env.ts'
import { Effect, Layer } from 'effect'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { Db, makeDatabase } from '../src/server/db/client.ts'
import { AchievementsService } from '../src/server/identity/achievements.ts'
import { backfillPlayerIdentity } from '../src/server/identity/backfill.ts'

// On Vercel this runs as part of `vercel-build`. Only production deploys migrate:
// previews would otherwise apply an unmerged branch's migrations to the shared database.
const vercelEnv = process.env.VERCEL ? process.env.VERCEL_ENV : undefined
if (vercelEnv && vercelEnv !== 'production') {
  console.log(`↷ skipping migrations on a ${vercelEnv} deploy`)
  process.exit(0)
}
if (vercelEnv === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set for the production deploy')
}

const url = process.env.DATABASE_URL ?? 'file:local.db'
const database = makeDatabase(url, process.env.DATABASE_AUTH_TOKEN)
await migrate(database, { migrationsFolder: 'drizzle' })
console.log(`✓ migrations applied to ${url.replace(/\/\/[^@/]*@/, '//')}`)

// Data the SQL migrations can't compute: default avatars (hashed from the user id) and achievements from history.
const { users } = await Effect.runPromise(
  backfillPlayerIdentity().pipe(
    Effect.provide(AchievementsService.layer.pipe(Layer.provideMerge(Db.fromDatabase(database)))),
  ),
)
if (users > 0) console.log(`✓ player identity backfilled for ${users} users`)
