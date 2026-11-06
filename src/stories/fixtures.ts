import type { EntrantView, EventDetail, MatchView, StandingView } from '#/server/events/views.ts'
import { defaultLook } from '#/domain/avatar-parts.ts'
import type { TrainerCardData } from '#/components/identity/trainer-card.tsx'
import { ACHIEVEMENTS, BADGE_COUNT, achievement, trophiesFor, type AchievementId } from '#/domain/achievements.ts'
import type { PlayerAchievements } from '#/server/identity/achievements.ts'
import type { FeaturedDeck } from '#/server/profiles/service.ts'

const ash = { id: 'ash', name: 'Ash Ketchum', username: 'ash', ...defaultLook('ash'), title: 'local-legend' as const }
const misty = { id: 'misty', name: 'Misty Waterflower', username: 'misty', ...defaultLook('misty') }
const brock = { id: 'brock', name: 'Brock Harrison', username: 'brock', ...defaultLook('brock') }
const gary = { id: 'gary', name: 'Gary Oak', username: 'gary', ...defaultLook('gary') }

export const playingMatch: MatchView = {
  id: 'match-1',
  roundNumber: 3,
  table: 7,
  player1: ash,
  player2: misty,
  player1Games: 0,
  player2Games: 0,
  outcome: null,
  reportedById: null,
  bracketSlot: null,
  dropped: false,
  status: 'playing',
}

const standing = (
  player: MatchView['player1'],
  rank: number,
  wins: number,
  losses: number,
  draws: number,
  omw: number,
): StandingView => ({
  playerId: player.id,
  player,
  rank,
  points: wins * 3 + draws,
  wins,
  losses,
  draws,
  byes: 0,
  opponents: [],
  winPercentage: wins / Math.max(1, wins + losses + draws),
  opponentWinPercentage: omw,
  opponentOpponentWinPercentage: 0.5,
  gameWinPercentage: wins / Math.max(1, wins + losses + draws),
  headToHead: false,
  stage: null,
  dropped: false,
})

export const standings: Array<StandingView> = [
  standing(ash, 1, 3, 0, 0, 0.58),
  standing(misty, 2, 2, 1, 0, 0.66),
  standing(gary, 3, 1, 1, 1, 0.5),
  { ...standing(brock, 4, 0, 3, 0, 0.75), dropped: true },
]

export const DRAGAPULT_LIST = `Pokémon: 16
4 Dreepy TWM 128
4 Drakloak TWM 129
3 Dragapult ex TWM 130
2 Duskull PRE 35
1 Dusclops PRE 36
1 Dusknoir PRE 37
1 Fezandipiti ex SFA 38

Trainer: 36
4 Arven SVI 166
4 Lillie's Determination MEG 119
2 Boss's Orders MEG 114
1 Iono PAL 185
4 Buddy-Buddy Poffin TEF 144
4 Ultra Ball SVI 196
4 Rare Candy SVI 191
4 Night Stretcher SFA 61
3 Counter Catcher PAR 160
3 Super Rod PAL 188
3 Area Zero Underdepths SCR 131

Energy: 8
4 Basic {R} Energy SVE 2
4 Basic {P} Energy SVE 5`

const seededPlayer = (id: string, name: string, seed: number): EntrantView => ({
  id,
  name,
  username: id,
  ...defaultLook(id),
  isGuest: false,
  deckId: null,
  deckName: null,
  droppedAtRound: null,
  finalRank: null,
  seed,
})

const ana = seededPlayer('ana', 'Ana Ribeiro', 1)
const bruno = seededPlayer('bruno', 'Bruno Costa', 2)
const carla = seededPlayer('carla', 'Carla Mendes', 3)
const diego = seededPlayer('diego', 'Diego Alves', 4)
const elisa = seededPlayer('elisa', 'Elisa Prado', 5)
const felipe = seededPlayer('felipe', 'Felipe Rocha', 6)
const gabi = seededPlayer('gabi', 'Gabi Nunes', 7)

const ref = ({ id, name, username, avatar, sleeveColour, title }: EntrantView) => ({
  id,
  name,
  username,
  avatar,
  sleeveColour,
  title,
})

/** A bracket match being played; `played` gives it a confirmed score. */
const bracketMatch = (
  roundNumber: number,
  table: number,
  slot: number,
  player1: EntrantView,
  player2: EntrantView,
): MatchView => ({
  id: `r${roundNumber}-t${table}`,
  roundNumber,
  table,
  player1: ref(player1),
  player2: ref(player2),
  player1Games: 0,
  player2Games: 0,
  outcome: null,
  reportedById: null,
  status: 'playing',
  bracketSlot: slot,
  dropped: false,
})

const played = (m: MatchView, player1Games: number, player2Games: number): MatchView => ({
  ...m,
  player1Games,
  player2Games,
  outcome: player1Games > player2Games ? 'p1' : 'p2',
  reportedById: m.player1.id,
  status: 'confirmed',
})

const bracketBye = (roundNumber: number, table: number, slot: number, player: EntrantView): MatchView => ({
  ...bracketMatch(roundNumber, table, slot, player, player),
  player2: null,
  player1Games: 2,
  outcome: 'bye',
  reportedById: player.id,
  status: 'confirmed',
})

const bracketMatches = [
  played(bracketMatch(1, 1, 1, diego, elisa), 2, 1),
  played(bracketMatch(1, 2, 2, bruno, gabi), 2, 0),
  played(bracketMatch(1, 3, 3, carla, felipe), 1, 2),
  bracketBye(1, 4, 0, ana),
  bracketMatch(2, 1, 0, ana, diego),
  played(bracketMatch(2, 2, 1, bruno, felipe), 2, 0),
]

/**
 * The bracket prototype's event: 7 players in single elimination (a bracket of
 * 8, so seed 1 has a bye), quarterfinals done and the semifinals being played.
 * The viewer is Diego (seed 4).
 */
export const bracketDetail: EventDetail = {
  event: {
    id: 'cup',
    name: 'Saturday League Cup',
    storeName: 'Pallet Town Games',
    format: 'standard',
    status: 'running',
    startsAt: 0,
    currentRound: 2,
    plannedRounds: 3,
    deckRequired: false,
    bestOf: 3,
    pairingSystem: 'single_elimination',
    topCut: false,
    topCutSize: null,
    entriesClosedReason: 'Entries are closed: the bracket has started',
    playerCount: 7,
    host: { id: 'host', name: 'Oak', username: 'oak', ...defaultLook('host') },
    description: null,
    joinCode: 'CUP234',
    roundMinutes: 50,
    topCutRoundMinutes: null,
    finishedAt: null,
  },
  players: [ana, bruno, carla, diego, elisa, felipe, gabi],
  rounds: [
    {
      id: 'r1',
      number: 1,
      status: 'finished',
      startedAt: 0,
      endsAt: 0,
      pausedRemainingMs: null,
      elimination: true,
      minutes: 50,
    },
    {
      id: 'r2',
      number: 2,
      status: 'active',
      startedAt: 0,
      endsAt: 50 * 60_000,
      pausedRemainingMs: null,
      elimination: true,
      minutes: 50,
    },
  ],
  matches: bracketMatches,
  standings: [],
  progress: { mainPhaseRounds: 3, bracket: { firstRound: 1, rounds: 3 }, isLastRound: false, cutDue: false },
  viewer: { userId: 'diego', isHost: false, entry: diego, currentMatch: bracketMatches[4]! },
  serverNow: 0,
}

/* ------------------------------------------------------------------ */
/* Player identity                                                     */
/* ------------------------------------------------------------------ */

export const trainerCard: TrainerCardData = {
  name: 'Ash Ketchum',
  username: 'ash',
  playerId: '1234567',
  joinedAt: Date.UTC(2025, 2, 1),
  bio: 'Pikachu main. Never misses a League Challenge.',
  avatar: { ...defaultLook('ash').avatar, hat: 'champion-cap', hair: 'spiky' },
  title: 'champion',
  sleeveColour: 'red',
  banner: 'prize-grid',
  bannerColour: 'blue',
  partner: {
    cardId: 'sv03.5-025',
    name: 'Pikachu',
    setName: '151',
    imageUrl: 'https://assets.tcgdex.net/en/sv/sv03.5/025/high.webp',
  },
  badges: [
    { achievement: 'champion', tier: 1 },
    { achievement: 'regular', tier: 3 },
    { achievement: 'undefeated', tier: 1 },
  ],
}

export const featuredDeck: FeaturedDeck = {
  id: 'deck-1',
  name: 'Dragapult ex',
  archetype: 'Dragapult / Dusknoir',
  format: 'standard',
  list: DRAGAPULT_LIST,
  coverCard: null,
  cardImages: {},
  wins: 12,
  losses: 5,
  draws: 1,
}

const tierViews = (id: AchievementId, best: number) =>
  achievement(id).tiers.map((t, i) => ({
    threshold: t.threshold,
    title: t.title ?? null,
    trophies: trophiesFor(id, i + 1),
    earnedAt: i < best ? Date.UTC(2026, 0, i + 1) : null,
  }))

export const playerAchievements: PlayerAchievements = {
  earnedCount: 6,
  total: BADGE_COUNT,
  achievements: ACHIEVEMENTS.map((a) => {
    const best = { regular: 3, champion: 1, 'match-winner': 2 }[a.id as string] ?? 0
    const hidden = a.secret && best === 0
    return {
      id: a.id,
      name: hidden ? '???' : a.name,
      description: hidden ? 'A secret achievement' : a.description,
      unit: a.unit,
      secret: a.secret,
      hidden,
      tiers: hidden ? [] : tierViews(a.id, best),
      bestTier: best,
      progress: hidden ? 0 : ({ regular: 12, champion: 1, 'match-winner': 17 }[a.id as string] ?? 0),
      next: hidden ? null : (a.tiers[best]?.threshold ?? null),
    }
  }),
}
