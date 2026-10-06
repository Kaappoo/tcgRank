import { Layer, ManagedRuntime } from 'effect'
import { Db } from './db/client.ts'
import { database } from './db/index.ts'
import { DecksService } from './decks/service.ts'
import { Mailer } from './email/mailer.ts'
import { EventsService } from './events/service.ts'
import { ProfilesService } from './profiles/service.ts'

const AppLayer = Layer.mergeAll(EventsService.layer, DecksService.layer, ProfilesService.layer).pipe(
  Layer.provideMerge(Layer.mergeAll(Db.fromDatabase(database), Mailer.layer)),
  Layer.orDie,
)

export type AppServices = Layer.Success<typeof AppLayer>

const memoMap = Layer.makeMemoMapUnsafe()

/** One runtime per server process; every server function and API route runs through it. */
export const runtime = ManagedRuntime.make(AppLayer, { memoMap })
