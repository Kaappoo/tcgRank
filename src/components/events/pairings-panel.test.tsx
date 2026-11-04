import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { EventDetail, MatchView } from '#/server/events/views.ts'
import { eventProgress } from '#/domain/progress.ts'
import { bracketDetail } from '#/stories/fixtures.ts'
import { PairingsPanel } from './pairings-panel.tsx'

/** The prototype's bracket as the top cut of a Swiss event: two Swiss rounds first. */
const shift = 2
const swissMatch = (roundNumber: number): MatchView => ({
  ...bracketDetail.matches[0]!,
  id: `swiss-${roundNumber}`,
  roundNumber,
  bracketSlot: null,
  table: 1,
})
const topCut = (rounds: number): EventDetail => {
  const swiss = [1, 2].map((n) => ({ ...bracketDetail.rounds[0]!, id: `s${n}`, number: n, elimination: false }))
  const cut = bracketDetail.rounds.map((r) => ({ ...r, number: r.number + shift })).slice(0, rounds)
  const event = {
    ...bracketDetail.event,
    pairingSystem: 'swiss' as const,
    topCut: true,
    topCutSize: rounds > 0 ? (8 as const) : null,
    currentRound: shift + rounds,
    plannedRounds: 2,
  }
  return {
    ...bracketDetail,
    event,
    progress: eventProgress(event, bracketDetail.players.length),
    rounds: [...swiss.map((r) => (rounds === 0 && r.number === 2 ? { ...r, status: 'active' as const } : r)), ...cut],
    matches: [
      swissMatch(1),
      swissMatch(2),
      ...bracketDetail.matches
        .map((m) => ({ ...m, roundNumber: m.roundNumber + shift }))
        .filter((m) => m.roundNumber <= shift + rounds),
    ],
  }
}

const renderPanel = (detail: EventDetail) => render(<PairingsPanel detail={detail} viewerId="diego" />)

describe('PairingsPanel', () => {
  it('keeps the Swiss view before the top cut', () => {
    renderPanel({ ...topCut(0), event: { ...topCut(0).event, currentRound: 2 } })
    expect(screen.queryByRole('region', { name: 'Your path' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Round 2' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('switches to the bracket view at the first round of the top cut, keeping the Swiss rounds a tap away', async () => {
    renderPanel(topCut(1))
    expect(screen.getByRole('region', { name: 'Your path' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Top cut' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'Round 1' }))
    expect(screen.queryByRole('region', { name: 'Your path' })).not.toBeInTheDocument()
  })

  it('shows a single-elimination event as a bracket from round 1, without round chips', () => {
    renderPanel(bracketDetail)
    expect(screen.getByRole('region', { name: 'Your path' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Choose round' })).not.toBeInTheDocument()
  })
})
