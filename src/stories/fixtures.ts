import type { MatchView, StandingView } from '#/server/events/views.ts'

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
