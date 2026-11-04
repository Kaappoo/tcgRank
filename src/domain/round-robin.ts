/**
 * Round-robin schedule: the circle method over the schedule positions drawn at
 * round 1. Pure, no IO.
 */
import type { Pairing } from './swiss.ts'

interface ScheduleRoundInput {
  /** Player ids in schedule-position order. */
  readonly schedule: ReadonlyArray<string>
  /** 1-based round of the schedule. */
  readonly round: number
  /** Players who dropped: their remaining matches become byes for their opponents. */
  readonly dropped?: ReadonlySet<string>
}

/**
 * The pairings for one round of the schedule. An odd field gets an empty seat,
 * so whoever faces it that round has a bye; over N rounds each player gets
 * exactly one. Position 1 stays put and the others rotate one seat per round.
 */
export const scheduleRound = ({ schedule, round, dropped = new Set() }: ScheduleRoundInput): Array<Pairing> => {
  const seats: Array<string | null> = schedule.length % 2 === 0 ? [...schedule] : [...schedule, null]
  const [fixed = null, ...rest] = seats
  const shift = (round - 1) % Math.max(1, rest.length)
  const circle = [fixed, ...rest.slice(rest.length - shift), ...rest.slice(0, rest.length - shift)]
  const present = (id: string | null): id is string => id !== null && !dropped.has(id)

  const matches: Array<[string, string]> = []
  const byes: Array<string> = []
  for (let i = 0; i < circle.length / 2; i++) {
    const a = circle[i] ?? null
    const b = circle[circle.length - 1 - i] ?? null
    if (present(a) && present(b)) matches.push([a, b])
    else if (present(a)) byes.push(a)
    else if (present(b)) byes.push(b)
  }

  return [
    ...matches.map(([player1Id, player2Id], i) => ({ table: i + 1, player1Id, player2Id })),
    ...byes.map((player1Id, i) => ({ table: matches.length + i + 1, player1Id, player2Id: null })),
  ]
}
