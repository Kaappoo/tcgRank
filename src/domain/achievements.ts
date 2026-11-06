/**
 * The achievement catalogue and the rules that turn a player's history into earned tiers (ADR 0004), plus the busy
 * rule that holds the unlock celebration back during a live event. Pure, no IO.
 *
 * Only qualifying events count (finished, 4+ players, 2+ of them with accounts) and only their confirmed matches.
 * Byes never count as wins. A player who dropped counts as having played if they played a match, but earns nothing
 * from placement. A tier's earned date is the finish date of the event that crossed its threshold.
 */
import { TROPHY_ITEMS, type TrophyItemId } from './avatar-parts.ts'

export const ACHIEVEMENT_IDS = [
  'regular',
  'match-winner',
  'champion',
  'top-cut',
  'host',
  'clean-sweep',
  'brewer',
  'undefeated',
  'explorer',
  'loyal',
  'comeback',
  'marathon',
  'rival',
] as const
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number]

export const TITLES = [
  { id: 'regular', name: 'Regular' },
  { id: 'local-legend', name: 'Local Legend' },
  { id: 'veteran', name: 'Veteran' },
  { id: 'champion', name: 'Champion' },
  { id: 'dynasty', name: 'Dynasty' },
  { id: 'organiser', name: 'Organiser' },
  { id: 'sweeper', name: 'Sweeper' },
  { id: 'brewer', name: 'Brewer' },
  { id: 'undefeated', name: 'Undefeated' },
] as const
export type TitleId = (typeof TITLES)[number]['id']
export const TITLE_IDS = TITLES.map((t) => t.id) as ReadonlyArray<TitleId>
export const titleName = (id: TitleId): string => TITLES.find((t) => t.id === id)!.name

export interface AchievementTier {
  readonly threshold: number
  readonly title?: TitleId
}

export interface Achievement {
  readonly id: AchievementId
  readonly name: string
  /** What reaching it means, for the Achievements tab and the trophy toast ("Win an event"). */
  readonly description: string
  /** Counted unit for progress ("7 / 10 events"). */
  readonly unit: string
  /** Shown as "???" until earned. */
  readonly secret: boolean
  /** One tier for a one-off achievement. */
  readonly tiers: ReadonlyArray<AchievementTier>
}

const tiers = (thresholds: ReadonlyArray<number>, titles: Readonly<Record<number, TitleId>> = {}) =>
  thresholds.map((threshold) => (titles[threshold] ? { threshold, title: titles[threshold] } : { threshold }))

export const ACHIEVEMENTS: ReadonlyArray<Achievement> = [
  {
    id: 'regular',
    name: 'Regular',
    description: 'Play in events',
    unit: 'events',
    secret: false,
    tiers: tiers([1, 5, 10, 25, 50, 100], { 25: 'regular', 100: 'local-legend' }),
  },
  {
    id: 'match-winner',
    name: 'Match winner',
    description: 'Win matches (byes don’t count)',
    unit: 'wins',
    secret: false,
    tiers: tiers([1, 10, 50, 100, 250, 500], { 250: 'veteran' }),
  },
  {
    id: 'champion',
    name: 'Champion',
    description: 'Win events',
    unit: 'events won',
    secret: false,
    tiers: tiers([1, 5, 10, 25], { 1: 'champion', 10: 'dynasty' }),
  },
  {
    id: 'top-cut',
    name: 'Top cut',
    description: 'Reach a top cut',
    unit: 'top cuts',
    secret: false,
    tiers: tiers([1, 5, 10, 25]),
  },
  {
    id: 'host',
    name: 'Host',
    description: 'Host events',
    unit: 'events hosted',
    secret: false,
    tiers: tiers([1, 10, 25, 50], { 10: 'organiser' }),
  },
  {
    id: 'clean-sweep',
    name: 'Clean sweep',
    description: 'Win best-of-3 or best-of-5 matches without dropping a game',
    unit: 'sweeps',
    secret: false,
    tiers: tiers([5, 25, 100], { 25: 'sweeper' }),
  },
  {
    id: 'brewer',
    name: 'Brewer',
    description: 'Register different decks in events',
    unit: 'decks',
    secret: false,
    tiers: tiers([1, 5, 15], { 15: 'brewer' }),
  },
  {
    id: 'undefeated',
    name: 'Undefeated',
    description: 'Finish an event of 3 or more rounds without losing a match',
    unit: 'events',
    secret: false,
    tiers: tiers([1], { 1: 'undefeated' }),
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Play in all four formats',
    unit: 'formats',
    secret: false,
    tiers: tiers([4]),
  },
  {
    id: 'loyal',
    name: 'Loyal',
    description: 'Register the same deck in 10 events',
    unit: 'events with one deck',
    secret: false,
    tiers: tiers([10]),
  },
  {
    id: 'comeback',
    name: 'Comeback',
    description: 'Win an event after losing round 1',
    unit: 'events',
    secret: true,
    tiers: tiers([1]),
  },
  {
    id: 'marathon',
    name: 'Marathon',
    description: 'Play 8 or more rounds in one event',
    unit: 'rounds',
    secret: true,
    tiers: tiers([8]),
  },
  {
    id: 'rival',
    name: 'Rival',
    description: 'Play the same opponent 10 times',
    unit: 'matches',
    secret: true,
    tiers: tiers([10]),
  },
]

export const BADGE_COUNT = ACHIEVEMENTS.reduce((sum, a) => sum + a.tiers.length, 0)

export const achievement = (id: AchievementId): Achievement => ACHIEVEMENTS.find((a) => a.id === id)!

/** The title a tier (1-based) grants, if any. */
export const titleFor = (id: AchievementId, tier: number): TitleId | null =>
  achievement(id).tiers[tier - 1]?.title ?? null

/** The trophy items a tier (1-based) grants. */
export const trophiesFor = (id: AchievementId, tier: number): ReadonlyArray<TrophyItemId> =>
  TROPHY_ITEMS.filter((t) => t.earnedAt.achievement === id && t.earnedAt.tier === tier).map((t) => t.id)

/** The tier (1-based) that grants a title. */
export const tierForTitle = (title: TitleId): { achievement: AchievementId; tier: number } => {
  for (const a of ACHIEVEMENTS) {
    const index = a.tiers.findIndex((t) => t.title === title)
    if (index >= 0) return { achievement: a.id, tier: index + 1 }
  }
  throw new Error(`Unknown title ${title}`)
}

/** A one-off achievement has a single tier; its badge carries a ★ instead of a number. */
export const isOneOff = (id: AchievementId): boolean => achievement(id).tiers.length === 1

/** Whether a tier is its achievement's top tier, the only one drawn in gold. */
export const isTopTier = (id: AchievementId, tier: number): boolean => achievement(id).tiers.length === tier

/* ------------------------------------------------------------------ */
/* History → earned tiers                                              */
/* ------------------------------------------------------------------ */

export interface HistoryMatch {
  readonly roundNumber: number
  /** Null for a bye. */
  readonly opponentId: string | null
  readonly result: 'win' | 'loss' | 'draw' | 'bye'
  readonly gamesWon: number
  readonly gamesLost: number
  readonly confirmed: boolean
  /** A round of a top cut or a single-elimination event. */
  readonly elimination: boolean
}

/** One event in a player's history: one they entered, hosted, or both. */
export interface HistoryEvent {
  readonly id: string
  readonly status: 'registration' | 'running' | 'finished'
  readonly finishedAt: number | null
  readonly format: string
  readonly bestOf: number
  readonly playerCount: number
  /** Players in the event who have an account (not guests). */
  readonly accountCount: number
  /** Rounds the event had, top cut included. */
  readonly rounds: number
  /** A Swiss event with a top cut. */
  readonly topCut: boolean
  /** The player hosted it. */
  readonly hosted: boolean
  /** The player's own entry; null if they only hosted. */
  readonly entry: {
    readonly droppedAtRound: number | null
    readonly finalRank: number | null
    readonly deckId: string | null
    readonly matches: ReadonlyArray<HistoryMatch>
  } | null
}

export interface EarnedTier {
  readonly achievement: AchievementId
  /** 1-based. */
  readonly tier: number
  readonly earnedAt: number
}

export const isQualifying = (event: Pick<HistoryEvent, 'status' | 'finishedAt' | 'playerCount' | 'accountCount'>) =>
  event.status === 'finished' && event.finishedAt !== null && event.playerCount >= 4 && event.accountCount >= 2

const ALL_FORMATS = 4

/** Every tier earned from a player's full history, with the date it was earned, and their progress on each achievement. */
export const earnedTiers = (
  history: ReadonlyArray<HistoryEvent>,
): { earned: ReadonlyArray<EarnedTier>; progress: Readonly<Record<AchievementId, number>> } => {
  const progress = Object.fromEntries(ACHIEVEMENT_IDS.map((id) => [id, 0])) as Record<AchievementId, number>
  const earned: Array<EarnedTier> = []
  const formats = new Set<string>()
  const decks = new Map<string, number>()
  const opponents = new Map<string, number>()

  const timeline = history
    .filter(isQualifying)
    .sort((a, b) => a.finishedAt! - b.finishedAt! || a.id.localeCompare(b.id))

  for (const event of timeline) {
    const add = (id: AchievementId, by = 1) => {
      progress[id] += by
    }
    const reach = (id: AchievementId, value: number) => {
      progress[id] = Math.max(progress[id], value)
    }

    if (event.hosted) add('host')

    const entry = event.entry
    const matches = entry?.matches.filter((m) => m.confirmed) ?? []
    if (entry && matches.length > 0) {
      const placed = entry.droppedAtRound === null
      const wins = matches.filter((m) => m.result === 'win')
      add('regular')
      add('match-winner', wins.length)
      if (event.bestOf >= 3) add('clean-sweep', wins.filter((m) => m.gamesLost === 0).length)
      formats.add(event.format)
      reach('explorer', Math.min(formats.size, ALL_FORMATS))
      if (entry.deckId) {
        decks.set(entry.deckId, (decks.get(entry.deckId) ?? 0) + 1)
        progress.brewer = decks.size
        reach('loyal', decks.get(entry.deckId)!)
      }
      for (const m of matches) {
        if (m.opponentId === null) continue
        opponents.set(m.opponentId, (opponents.get(m.opponentId) ?? 0) + 1)
        reach('rival', opponents.get(m.opponentId)!)
      }
      reach('marathon', matches.length)

      if (placed) {
        const won = entry.finalRank === 1
        if (won) add('champion')
        if (event.topCut && matches.some((m) => m.elimination)) add('top-cut')
        if (event.rounds >= 3 && !matches.some((m) => m.result === 'loss')) add('undefeated')
        if (won && matches.find((m) => m.roundNumber === 1)?.result === 'loss') add('comeback')
      }
    }

    for (const a of ACHIEVEMENTS) {
      a.tiers.forEach((t, index) => {
        const tier = index + 1
        if (progress[a.id] >= t.threshold && !earned.some((e) => e.achievement === a.id && e.tier === tier)) {
          earned.push({ achievement: a.id, tier, earnedAt: event.finishedAt! })
        }
      })
    }
  }

  return { earned, progress }
}

/* ------------------------------------------------------------------ */
/* Busy                                                                */
/* ------------------------------------------------------------------ */

type EventStatus = 'registration' | 'running' | 'finished'

/**
 * A player is busy while they are entered (and not dropped) in a running event, or host one. The unlock celebration
 * waits until they aren't, so it never covers a pairing, the clock or the host desk.
 */
export const isBusy = ({
  entries,
  hosted,
}: {
  entries: ReadonlyArray<{ status: EventStatus; dropped: boolean }>
  hosted: ReadonlyArray<{ status: EventStatus }>
}): boolean => entries.some((e) => e.status === 'running' && !e.dropped) || hosted.some((e) => e.status === 'running')

/* ------------------------------------------------------------------ */
/* What earned tiers unlock                                            */
/* ------------------------------------------------------------------ */

export interface Rewards {
  readonly achievements: ReadonlySet<AchievementId>
  readonly titles: ReadonlySet<TitleId>
  readonly trophies: ReadonlySet<TrophyItemId>
}

/** The achievements (for the showcase), titles and trophy items a set of earned tiers unlocks. */
export const rewardsOf = (
  earned: ReadonlyArray<{ readonly achievement: AchievementId; readonly tier: number }>,
): Rewards => ({
  achievements: new Set(earned.map((e) => e.achievement)),
  titles: new Set(earned.flatMap((e) => titleFor(e.achievement, e.tier) ?? [])),
  trophies: new Set(earned.flatMap((e) => trophiesFor(e.achievement, e.tier))),
})

/** A player's best tier of each achievement they have earned. */
export const bestTiers = (
  earned: ReadonlyArray<{ readonly achievement: AchievementId; readonly tier: number }>,
): ReadonlyMap<AchievementId, number> => {
  const best = new Map<AchievementId, number>()
  for (const e of earned) best.set(e.achievement, Math.max(best.get(e.achievement) ?? 0, e.tier))
  return best
}
