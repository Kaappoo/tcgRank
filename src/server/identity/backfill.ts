import { eq, isNull } from 'drizzle-orm'
import { Effect } from 'effect'
import { Db } from '../db/client.ts'
import { playerStyle, user } from '../db/schema.ts'
import { AchievementsService, BACKFILL_SEEN_AT } from './achievements.ts'
import { insertDefaultStyles } from './style.ts'

/**
 * The launch backfill, run after migrations: every user without a style (guests included) gets their stored default
 * look and sleeve colour, and their achievements worked out from history. Their last-seen marker sits before every
 * backfilled tier, so the launch welcome plays once. Safe to rerun: users who already have a style are left alone.
 */
export const backfillPlayerIdentity = Effect.fn('backfillPlayerIdentity')(function* () {
  const db = yield* Db
  const achievements = yield* AchievementsService
  const missing = yield* db.query((d) =>
    d
      .select({ id: user.id })
      .from(user)
      .leftJoin(playerStyle, eq(playerStyle.userId, user.id))
      .where(isNull(playerStyle.userId)),
  )
  const ids = missing.map((m) => m.id)
  // Inserted in chunks: SQLite caps the parameters of one statement.
  for (let i = 0; i < ids.length; i += 50) yield* insertDefaultStyles(ids.slice(i, i + 50), BACKFILL_SEEN_AT)
  yield* achievements.refresh(ids)
  return { users: ids.length }
})
