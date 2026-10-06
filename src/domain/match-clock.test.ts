import { describe, expect, it } from '@effect/vitest'
import {
  adjustClock,
  clockPhase,
  formatClock,
  pauseClock,
  remainingMs,
  resumeClock,
  startClock,
} from './match-clock.ts'

describe('match clock', () => {
  const t0 = 1_000_000

  it('counts down from the configured round length', () => {
    const clock = startClock(t0, 50)
    expect(remainingMs(clock, t0 + 60_000)).toBe(49 * 60_000)
    expect(clockPhase(clock, t0)).toBe('running')
  })

  it('freezes while paused and resumes with the same time left', () => {
    const paused = pauseClock(startClock(t0, 50), t0 + 10 * 60_000)
    expect(clockPhase(paused, t0 + 99 * 60_000)).toBe('paused')
    expect(remainingMs(paused, t0 + 99 * 60_000)).toBe(40 * 60_000)
    const resumed = resumeClock(paused, t0 + 20 * 60_000)
    expect(remainingMs(resumed, t0 + 20 * 60_000)).toBe(40 * 60_000)
  })

  it('adds or removes time whether running or paused', () => {
    expect(remainingMs(adjustClock(startClock(t0, 50), 5 * 60_000), t0)).toBe(55 * 60_000)
    expect(adjustClock({ endsAt: null, pausedRemainingMs: 60_000 }, -120_000).pausedRemainingMs).toBe(0)
  })

  it('reports overtime once time is called', () => {
    expect(clockPhase(startClock(t0, 1), t0 + 61_000)).toBe('overtime')
  })

  it.each([
    [50 * 60_000, '50:00'],
    [61_500, '01:01'],
    [0, '00:00'],
    [-90_000, '+01:30'],
  ])('formats %i ms as %s', (ms, text) => {
    expect(formatClock(ms)).toBe(text)
  })
})
