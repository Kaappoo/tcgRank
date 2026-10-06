import { config } from 'dotenv'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { makeDatabase } from '../src/server/db/client.ts'

config({ path: ['.env.local', '.env'] })

const url = process.env.DATABASE_URL ?? 'file:local.db'
await migrate(makeDatabase(url, process.env.DATABASE_AUTH_TOKEN), { migrationsFolder: 'drizzle' })
console.log(`✓ migrations applied to ${url}`)
