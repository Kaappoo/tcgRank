import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MatchView } from '#/server/events/views.ts'
import { ReportResult } from './report-result.tsx'

const match: MatchView = {
  id: 'm1',
  roundNumber: 2,
  table: 4,
  player1: { id: 'misty', name: 'Misty', username: 'misty', image: null },
  player2: { id: 'ash', name: 'Ash', username: 'ash', image: null },
  player1Games: 0,
  player2Games: 0,
  outcome: null,
  reportedById: null,
  status: 'playing',
}

describe('ReportResult', () => {
  it('maps "my score" to the stored player order', async () => {
    const onReport = vi.fn()
    render(<ReportResult match={match} viewerId="ash" onReport={onReport} onConfirm={vi.fn()} />)
    const submit = screen.getByRole('button', { name: 'Submit result' })
    expect(submit).toBeDisabled()
    await userEvent.click(screen.getByRole('radio', { name: 'Won 2–1' }))
    await userEvent.click(submit)
    // Ash is player 2, so his 2–1 win is stored as 1–2.
    expect(onReport).toHaveBeenCalledWith({ player1Games: 1, player2Games: 2 })
  })

  it("asks the opponent to confirm the other player's report", async () => {
    const onConfirm = vi.fn()
    render(
      <ReportResult
        match={{ ...match, player1Games: 2, player2Games: 0, outcome: 'p1', reportedById: 'misty', status: 'reported' }}
        viewerId="ash"
        onReport={vi.fn()}
        onConfirm={onConfirm}
      />,
    )
    expect(screen.getByText('Your opponent reported')).toBeInTheDocument()
    expect(screen.getByText('Lost 0–2')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('lets the reporter change a pending result but not confirm it', async () => {
    render(
      <ReportResult
        match={{ ...match, player1Games: 1, player2Games: 2, outcome: 'p2', reportedById: 'ash', status: 'reported' }}
        viewerId="ash"
        onReport={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Change' }))
    expect(screen.getByRole('radiogroup', { name: 'Match result' })).toBeInTheDocument()
  })

  it('shows the final result once confirmed', () => {
    render(
      <ReportResult
        match={{ ...match, player1Games: 1, player2Games: 1, outcome: 'draw', status: 'confirmed' }}
        viewerId="misty"
        onReport={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByText('Tie 1–1')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })
})
