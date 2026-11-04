import type { EntrantView, EventDetail, MatchView, StandingView } from '#/server/events/views.ts'

const ash = { id: 'ash', name: 'Ash Ketchum', username: 'ash', image: null }
const misty = { id: 'misty', name: 'Misty Waterflower', username: 'misty', image: null }
const brock = { id: 'brock', name: 'Brock Harrison', username: 'brock', image: null }
const gary = { id: 'gary', name: 'Gary Oak', username: 'gary', image: null }

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
  player: typeof ash,
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
  image: null,
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

const ref = ({ id, name, username, image }: EntrantView) => ({ id, name, username, image })

const bracketMatch = (
  roundNumber: number,
  table: number,
  slot: number,
  player1: EntrantView,
  player2: EntrantView | null,
  result: { games: readonly [number, number]; status: MatchView['status'] } | null,
): MatchView => {
  const [player1Games, player2Games] = player2 === null ? [2, 0] : (result?.games ?? [0, 0])
  return {
    id: `r${roundNumber}-t${table}`,
    roundNumber,
    table,
    player1: ref(player1),
    player2: player2 && ref(player2),
    player1Games,
    player2Games,
    outcome: player2 === null ? 'bye' : result ? (player1Games > player2Games ? 'p1' : 'p2') : null,
    reportedById: result || player2 === null ? player1.id : null,
    status: player2 === null ? 'confirmed' : (result?.status ?? 'playing'),
    bracketSlot: slot,
    dropped: false,
  }
}

const final = { status: 'confirmed' } as const

const bracketMatches = [
  bracketMatch(1, 1, 1, diego, elisa, { games: [2, 1], ...final }),
  bracketMatch(1, 2, 2, bruno, gabi, { games: [2, 0], ...final }),
  bracketMatch(1, 3, 3, carla, felipe, { games: [1, 2], ...final }),
  bracketMatch(1, 4, 0, ana, null, null),
  bracketMatch(2, 1, 0, ana, diego, null),
  bracketMatch(2, 2, 1, bruno, felipe, { games: [2, 0], ...final }),
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
    entriesClosedReason: 'Entries are closed: the bracket has started',
    playerCount: 7,
    host: { id: 'host', name: 'Oak', username: 'oak', image: null },
    description: null,
    joinCode: 'CUP234',
    roundMinutes: 50,
    finishedAt: null,
  },
  players: [ana, bruno, carla, diego, elisa, felipe, gabi],
  rounds: [
    { id: 'r1', number: 1, status: 'finished', startedAt: 0, endsAt: 0, pausedRemainingMs: null, elimination: true },
    {
      id: 'r2',
      number: 2,
      status: 'active',
      startedAt: 0,
      endsAt: 50 * 60_000,
      pausedRemainingMs: null,
      elimination: true,
    },
  ],
  matches: bracketMatches,
  standings: [],
  viewer: { userId: 'diego', isHost: false, entry: diego, currentMatch: bracketMatches[4]! },
  serverNow: 0,
}
