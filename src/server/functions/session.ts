import { createServerFn } from '@tanstack/react-start'
import { Effect } from 'effect'
import type { SessionView } from '../current-user.ts'
import { currentSessionUser } from '../effect/run.ts'
import { PlayerStyleService } from '../identity/player-style.ts'
import { runtime } from '../runtime.ts'

/** The signed-in user with their avatar (for the account menu), or null. */
export const getSessionUser = createServerFn({ method: 'GET' }).handler(async (): Promise<SessionView | null> => {
  const user = await currentSessionUser()
  if (!user) return null
  const style = await runtime.runPromise(PlayerStyleService.use((s) => s.get(user.id)).pipe(Effect.orDie))
  return { ...user, avatar: style.avatar }
})
