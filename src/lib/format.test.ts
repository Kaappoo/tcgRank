import { describe, expect, it } from 'vitest'
import { podiumLine, roundPairedTitle, statusLabel } from './format.ts'

const standing = { stage: null, points: 12, wins: 3, losses: 1, draws: 0, byes: 1 }

describe('podiumLine', () => {
  it('Swiss and round robin: points and record, byes counted as wins', () => {
    expect(podiumLine(standing, { topCut: false })).toBe('12 pts · 4-1-0')
  })

  it('single elimination: the stage and the bracket record', () => {
    expect(podiumLine({ ...standing, stage: 'Champion', byes: 0 }, { topCut: false })).toBe('Champion · 3–1')
  })

  it('top cut: the stage plus the Swiss record and points', () => {
    expect(podiumLine({ ...standing, stage: 'Champion' }, { topCut: true })).toBe('Champion · 12 pts · 4-1-0')
  })
})

const swiss = { pairingSystem: 'swiss' as const, plannedRounds: 5, topCutSize: null, status: 'running' as const }
const cutEvent = { ...swiss, topCutSize: 8 as const }
const bracket = { ...swiss, pairingSystem: 'single_elimination' as const, plannedRounds: 3 }

describe('statusLabel', () => {
  it.each([
    ['registration', { ...swiss, status: 'registration' as const, currentRound: 0 }, 'Registration open'],
    ['a Swiss round', { ...swiss, currentRound: 3 }, 'Round 3 live'],
    ['a top cut’s first round', { ...cutEvent, currentRound: 6 }, 'Top 8 live'],
    ['a top cut’s semifinal', { ...cutEvent, currentRound: 7 }, 'Semifinal live'],
    ['a bracket’s final', { ...bracket, currentRound: 3 }, 'Final live'],
    ['a finished event', { ...bracket, status: 'finished' as const, currentRound: 3 }, 'Final standings'],
  ])('names the stage of %s', (_, event, label) => {
    expect(statusLabel(event)).toBe(label)
  })
})

describe('roundPairedTitle', () => {
  it.each([
    ['a Swiss round', { ...swiss, currentRound: 3 }, 'Round 3 is paired'],
    ['a top cut’s semifinals', { ...cutEvent, currentRound: 7 }, 'Semifinals are paired'],
    ['a bracket’s final', { ...bracket, currentRound: 3 }, 'The final is paired'],
    ['a bracket’s quarterfinals', { ...bracket, currentRound: 1 }, 'Quarterfinals are paired'],
  ])('names the stage of %s', (_, event, title) => {
    expect(roundPairedTitle(event)).toBe(title)
  })
})
