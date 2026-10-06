import { makeDatabase } from './client.ts'

/** Process-wide connection shared by better-auth and the Effect runtime. */
export const database = makeDatabase(process.env.DATABASE_URL ?? 'file:local.db', process.env.DATABASE_AUTH_TOKEN)
