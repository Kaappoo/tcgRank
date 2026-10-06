import './env.ts'
import { Effect } from 'effect'
import { auth } from '../src/server/auth.ts'
import { CurrentUser, type SessionUser } from '../src/server/current-user.ts'
import { DecksService } from '../src/server/decks/service.ts'
import { EventsService } from '../src/server/events/service.ts'
import { runtime } from '../src/server/runtime.ts'

/**
 * Demo data: a host, eight players with decks, one finished Cup and one
 * League Challenge that is live in round 2. Everyone's password is "pallet-town-1".
 */
const PASSWORD = 'pallet-town-1'
const people = [
  ['Professor Oak', 'oak'],
  ['Ash Ketchum', 'ash'],
  ['Misty Waterflower', 'misty'],
  ['Brock Harrison', 'brock'],
  ['Gary Oak', 'gary'],
  ['Dawn Berlitz', 'dawn'],
  ['Iris Opelucid', 'iris'],
  ['Serena Yvonne', 'serena'],
  ['Cynthia Shirona', 'cynthia'],
] as const

const decks = [
  [
    'Dragapult ex',
    'Dragapult / Dusknoir',
    '4 Dreepy TWM 128\n4 Drakloak TWM 129\n3 Dragapult ex TWM 130\n4 Arven SVI 166',
  ],
  ['Gardevoir ex', 'Gardevoir / Munkidori', '4 Ralts SVI 84\n2 Kirlia SVI 85\n2 Gardevoir ex SVI 86\n4 Arven SVI 166'],
  [
    'Charizard ex',
    'Charizard / Pidgeot',
    '3 Charmander PAF 7\n2 Charizard ex OBF 125\n2 Pidgeot ex OBF 164\n4 Rare Candy SVI 191',
  ],
] as const

const users: Array<SessionUser> = []
for (const [name, username] of people) {
  const email = `${username}@demo.tcgrank.app`
  const result = await auth.api
    .signUpEmail({ body: { name, email, password: PASSWORD, username } })
    .catch(() => auth.api.signInEmail({ body: { email, password: PASSWORD } }))
  const u = result.user as typeof result.user & { username?: string | null }
  users.push({ id: u.id, name: u.name, email: u.email, username: u.username ?? username, image: u.image ?? null })
}
const [host, ...players] = users as [SessionUser, ...Array<SessionUser>]
const as = <A, E, R>(who: SessionUser, effect: Effect.Effect<A, E, R>) =>
  Effect.provideService(effect, CurrentUser, who)

const program = Effect.gen(function* () {
  const events = yield* EventsService
  const deckService = yield* DecksService

  for (const [i, p] of players.entries()) {
    const [name, archetype, list] = decks[i % decks.length]!
    yield* as(p, deckService.create({ name, archetype, list, format: 'standard', isPublic: true }))
  }

  const playEvent = Effect.fn('seed.playEvent')(function* (name: string, rounds: number, finish: boolean) {
    const { id } = yield* as(
      host,
      events.create({
        name,
        storeName: 'Pallet Town Games',
        format: 'standard',
        plannedRounds: 3,
        roundMinutes: 50,
        startsAt: new Date(),
      }),
    )
    for (const p of players) yield* as(p, events.join(id))
    for (let r = 1; r <= rounds; r++) {
      yield* as(host, events.startNextRound(id))
      const detail = yield* events.detail(id)
      const open = detail.matches.filter((m) => m.roundNumber === r && m.status !== 'confirmed')
      // Leave the last round of a live event partially reported so the hub has something to show.
      const toReport = !finish && r === rounds ? open.slice(0, 2) : open
      for (const [t, m] of toReport.entries()) {
        const [a, b] = [
          [2, 0],
          [2, 1],
          [1, 2],
          [1, 1],
        ][t % 4]!
        yield* as(host, events.reportResult(m.id, a!, b!))
      }
    }
    if (finish) yield* as(host, events.finishEvent(id))
    return id
  })

  const cup = yield* playEvent('Pallet Town League Cup', 3, true)
  const live = yield* playEvent('Tuesday League Challenge', 2, false)
  return { cup, live }
})

const { cup, live } = await runtime.runPromise(program)
console.log(`✓ seeded — finished event /events/${cup}, live event /events/${live}`)
console.log(`  sign in as oak (host) or ash, misty, … with password "${PASSWORD}"`)
await runtime.dispose()
