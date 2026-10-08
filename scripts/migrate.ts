import './env.ts'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { makeDatabase } from '../src/server/db/client.ts'

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
await migrate(makeDatabase(url, process.env.DATABASE_AUTH_TOKEN), { migrationsFolder: 'drizzle' })
console.log(`✓ migrations applied to ${url.replace(/\/\/[^@/]*@/, '//')}`)
