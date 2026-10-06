/**
 * The match clock is stored as two nullable columns so it survives restarts
 * and stays consistent between every device in the store:
 *
 * - running: `endsAt` is set, `pausedRemainingMs` is null
 * - paused:  `endsAt` is null, `pausedRemainingMs` holds what was left
 */
export interface ClockState {
  readonly endsAt: number | null
  readonly pausedRemainingMs: number | null
}

export type ClockPhase = 'running' | 'paused' | 'overtime'

export const remainingMs = (clock: ClockState, now: number): number => {
  if (clock.endsAt === null) return clock.pausedRemainingMs ?? 0
  return clock.endsAt - now
}

export const clockPhase = (clock: ClockState, now: number): ClockPhase => {
  if (clock.endsAt === null) return 'paused'
  return remainingMs(clock, now) <= 0 ? 'overtime' : 'running'
}

export const startClock = (now: number, minutes: number): ClockState => ({
  endsAt: now + minutes * 60_000,
  pausedRemainingMs: null,
})

export const pauseClock = (clock: ClockState, now: number): ClockState =>
  clock.endsAt === null ? clock : { endsAt: null, pausedRemainingMs: Math.max(0, clock.endsAt - now) }

export const resumeClock = (clock: ClockState, now: number): ClockState =>
  clock.endsAt !== null ? clock : { endsAt: now + (clock.pausedRemainingMs ?? 0), pausedRemainingMs: null }

export const adjustClock = (clock: ClockState, deltaMs: number): ClockState =>
  clock.endsAt === null
    ? { endsAt: null, pausedRemainingMs: Math.max(0, (clock.pausedRemainingMs ?? 0) + deltaMs) }
    : { endsAt: clock.endsAt + deltaMs, pausedRemainingMs: null }

/** "49:07" style, with a leading "+" once the round goes to time. */
export const formatClock = (ms: number): string => {
  const overtime = ms < 0
  const totalSeconds = Math.floor(Math.abs(ms) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${overtime ? '+' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Last five minutes are highlighted at the table. */
export const URGENT_THRESHOLD_MS = 5 * 60_000
