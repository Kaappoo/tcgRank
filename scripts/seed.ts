import './env.ts'
import { auth } from '../src/server/auth.ts'
import type { SessionUser } from '../src/server/current-user.ts'
import { runtime } from '../src/server/runtime.ts'
import { seedDemo } from '../src/server/seed.ts'

/**
 * Demo data: a host, eight players with decks and one event per pairing system (see `seedDemo`).
 * Everyone's password is "pallet-town-1".
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

const users: Array<SessionUser> = []
for (const [name, username] of people) {
  const email = `${username}@demo.tcgrank.app`
  const result = await auth.api
    .signUpEmail({ body: { name, email, password: PASSWORD, username } })
    .catch(() => auth.api.signInEmail({ body: { email, password: PASSWORD } }))
  const u = result.user as typeof result.user & { username?: string | null }
  users.push({ id: u.id, name: u.name, email: u.email, username: u.username ?? username })
}
const [host, ...players] = users as [SessionUser, ...Array<SessionUser>]

const ids = await runtime.runPromise(seedDemo({ host, players }))
console.log('✓ seeded')
console.log(`  finished Swiss Cup             /events/${ids.cup}`)
console.log(`  live Swiss, round 2            /events/${ids.live}`)
console.log(`  finished round robin           /events/${ids.roundRobin}`)
console.log(`  single elimination, semifinals /events/${ids.singleElimination}`)
console.log(`  Swiss in its top 4             /events/${ids.topCut}`)
console.log(`  sign in as oak (host) or ash, misty, … with password "${PASSWORD}"`)
await runtime.dispose()
