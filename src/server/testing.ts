import { Effect, Layer } from 'effect'
import { newId } from '#/domain/ids.ts'
import { CurrentUser, type SessionUser } from './current-user.ts'
import { Db } from './db/client.ts'
import { user } from './db/schema.ts'

/** Inserts a user row straight into the test database. */
export const insertUser = Effect.fn('testing.insertUser')(function* (name: string) {
  const db = yield* Db
  const row: SessionUser = {
    id: newId(),
    name,
    email: `${name.toLowerCase().replace(/\W/g, '')}-${newId()}@example.test`,
    username: `${name.toLowerCase().replace(/\W/g, '')}_${newId().slice(0, 4)}`,
    image: null,
  }
  yield* db.query((d) => d.insert(user).values(row))
  return row
})

/** Runs an effect as the given signed-in user. */
export const asUser =
  (who: SessionUser) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.provideService(effect, CurrentUser, who)

export const withDb = <ROut, E, RIn>(layer: Layer.Layer<ROut, E, RIn>) => layer.pipe(Layer.provideMerge(Db.layerTest))
