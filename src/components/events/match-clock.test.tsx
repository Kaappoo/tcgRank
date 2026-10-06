import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MatchClock } from './match-clock.tsx'

describe('MatchClock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-06T19:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('counts down every second', () => {
    render(<MatchClock endsAt={Date.now() + 50 * 60_000} pausedRemainingMs={null} roundMinutes={50} />)
    expect(screen.getByRole('timer')).toHaveTextContent('50:00')
    act(() => vi.advanceTimersByTime(61_000))
    expect(screen.getByRole('timer')).toHaveTextContent('48:59')
  })

  it('shows the paused remainder', () => {
    render(<MatchClock endsAt={null} pausedRemainingMs={12 * 60_000 + 5_000} roundMinutes={50} />)
    expect(screen.getByRole('timer')).toHaveTextContent('12:05')
    expect(screen.getByText(/paused by the host/i)).toBeInTheDocument()
  })

  it('calls time with the Pokémon end-of-round rule', () => {
    render(<MatchClock endsAt={Date.now() - 90_000} pausedRemainingMs={null} roundMinutes={50} />)
    expect(screen.getByRole('timer')).toHaveTextContent('+01:30')
    expect(screen.getByText(/3 more turns/)).toBeInTheDocument()
  })

  it('applies the server clock offset', () => {
    render(<MatchClock endsAt={Date.now() + 10 * 60_000} pausedRemainingMs={null} roundMinutes={50} offsetMs={60_000} />)
    expect(screen.getByRole('timer')).toHaveTextContent('09:00')
  })
})
