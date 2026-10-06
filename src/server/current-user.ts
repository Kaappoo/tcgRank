import { Context, Effect, Option } from 'effect'
import { Unauthenticated } from './errors.ts'

export interface SessionUser {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly username: string | null
  readonly image: string | null
}

/** The signed-in user for the current request. Absent for anonymous visitors. */
export class CurrentUser extends Context.Service<CurrentUser, SessionUser>()('tcgrank/server/CurrentUser') {}

export const requireUser = Effect.serviceOption(CurrentUser).pipe(
  Effect.flatMap(Option.match({ onNone: () => Effect.fail(new Unauthenticated()), onSome: Effect.succeed })),
)

export const optionalUser = Effect.serviceOption(CurrentUser).pipe(Effect.map(Option.getOrNull))
