import { notFound } from '@tanstack/react-router'
import { getRequestHeaders, setResponseStatus } from '@tanstack/react-start/server'
import { Cause, Effect, Exit, Option } from 'effect'
import { auth } from '../auth.ts'
import { CurrentUser, type SessionUser } from '../current-user.ts'
import { httpStatusFor, type AppError } from '../errors.ts'
import { runtime, type AppServices } from '../runtime.ts'

export const currentSessionUser = async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session) return null
  const u = session.user as typeof session.user & { username?: string | null }
  return { id: u.id, name: u.name, email: u.email, username: u.username ?? null, image: u.image ?? null }
}

/**
 * Bridges an Effect program into a TanStack Start server function:
 * provides the signed-in user, runs it on the shared runtime and turns typed
 * failures into HTTP-aware errors the client can render.
 */
export const runServerEffect = async <A>(effect: Effect.Effect<A, AppError, AppServices>): Promise<A> => {
  const user = await currentSessionUser()
  const program = user ? Effect.provideService(effect, CurrentUser, user) : effect
  const exit = await runtime.runPromiseExit(program)
  if (Exit.isSuccess(exit)) return exit.value

  const failure = Cause.findErrorOption(exit.cause)
  if (Option.isSome(failure)) {
    const error = failure.value
    if (error._tag === 'NotFound') throw notFound()
    setResponseStatus(httpStatusFor(error))
    if (error._tag === 'DatabaseError') console.error(Cause.pretty(exit.cause))
    throw new Error(error.message)
  }

  console.error(Cause.pretty(exit.cause))
  setResponseStatus(500)
  throw new Error('Something went wrong on our side. Try again in a moment.')
}
