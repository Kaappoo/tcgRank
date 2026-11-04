import { describe, expect, it } from 'vitest'
import { podiumLine } from './format.ts'

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
