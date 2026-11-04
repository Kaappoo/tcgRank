import { describe, expect, it } from 'vitest'
import { eventProgress, nextRoundRefusal } from './progress.ts'

const swiss = { pairingSystem: 'swiss' as const, topCut: false, topCutSize: null, plannedRounds: 3, currentRound: 1 }

describe('nextRoundRefusal', () => {
  it.each([
    ['a Swiss round to go', swiss, null],
    ['the last Swiss round', { ...swiss, currentRound: 3 }, 'All 3 Swiss rounds have been played'],
    [
      'the last round of a schedule',
      { ...swiss, pairingSystem: 'round_robin' as const, currentRound: 3 },
      'All 3 rounds of the schedule have been played',
    ],
    [
      'a bracket’s final',
      { ...swiss, pairingSystem: 'single_elimination' as const, currentRound: 3 },
      'The final has been played',
    ],
    ['a top cut’s semifinal', { ...swiss, topCut: true, topCutSize: 4, currentRound: 4 }, null],
    ['a top cut’s final', { ...swiss, topCut: true, topCutSize: 4, currentRound: 5 }, 'The final has been played'],
  ])('after %s: %s', (_, event, refusal) => {
    expect(nextRoundRefusal(event, event.plannedRounds)).toBe(refusal)
  })
})

describe('eventProgress', () => {
  it('works out the rounds at the current attendance before any are stored', () => {
    const progress = eventProgress(
      { ...swiss, pairingSystem: 'single_elimination', plannedRounds: 0, currentRound: 0 },
      5,
    )
    expect(progress).toEqual({
      mainPhaseRounds: 3,
      bracket: { firstRound: 1, rounds: 3 },
      isLastRound: false,
      cutDue: false,
    })
  })

  it.each([
    ['during the Swiss rounds', { ...swiss, topCut: true, currentRound: 2 }, false, false],
    ['after the last Swiss round', { ...swiss, topCut: true, currentRound: 3 }, true, true],
    ['without a top cut', { ...swiss, currentRound: 3 }, true, false],
    ['once cut', { ...swiss, topCut: true, topCutSize: 4, currentRound: 4 }, false, false],
  ])('%s: last round %s, cut due %s', (_, event, isLastRound, cutDue) => {
    expect(eventProgress(event, 12)).toMatchObject({ isLastRound, cutDue })
  })

  it('a top cut plays its bracket after the Swiss rounds', () => {
    expect(eventProgress({ ...swiss, topCut: true, topCutSize: 8, currentRound: 4 }, 30).bracket).toEqual({
      firstRound: 4,
      rounds: 3,
      topCutSize: 8,
    })
  })
})
