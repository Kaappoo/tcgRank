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
  it('maps "my games" to the stored player order', async () => {
    const onReport = vi.fn()
    render(<ReportResult match={match} viewerId="ash" bestOf={3} onReport={onReport} onConfirm={vi.fn()} />)
    expect(screen.getByText('Best of 3')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add a game: My games' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add a game: My games' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add a game: Their games' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send result' }))
    // Ash is player 2, so his 2–1 win is stored as 1–2.
    expect(onReport).toHaveBeenCalledWith({ player1Games: 1, player2Games: 2 })
  })

  it('fits the steppers to the event’s best of', () => {
    render(<ReportResult match={match} viewerId="ash" bestOf={1} onReport={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByText('Best of 1')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'My games' })).toHaveAttribute('aria-valuemax', '1')
  })

  it("asks the opponent to confirm the other player's report", async () => {
    const onConfirm = vi.fn()
    render(
      <ReportResult
        match={{ ...match, player1Games: 2, player2Games: 0, outcome: 'p1', reportedById: 'misty', status: 'reported' }}
        viewerId="ash"
        bestOf={3}
        onReport={vi.fn()}
        onConfirm={onConfirm}
      />,
    )
    expect(screen.getByText('Your opponent reported')).toBeInTheDocument()
    expect(screen.getByText('Lost 0–2')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('lets the opponent report a different score, starting from what was reported', async () => {
    const onReport = vi.fn()
    render(
      <ReportResult
        match={{ ...match, player1Games: 2, player2Games: 0, outcome: 'p1', reportedById: 'misty', status: 'reported' }}
        viewerId="ash"
        bestOf={3}
        onReport={onReport}
        onConfirm={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Report different score' }))
    expect(screen.getByRole('status')).toHaveTextContent('Lost 0–2')
    await userEvent.click(screen.getByRole('button', { name: 'Add a game: My games' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send result' }))
    expect(onReport).toHaveBeenCalledWith({ player1Games: 2, player2Games: 1 })
  })

  it('lets the reporter change a pending result but not confirm it', async () => {
    render(
      <ReportResult
        match={{ ...match, player1Games: 1, player2Games: 2, outcome: 'p2', reportedById: 'ash', status: 'reported' }}
        viewerId="ash"
        bestOf={3}
        onReport={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Change' }))
    // The steppers come back prefilled with what Ash sent: his 2–1 win.
    expect(screen.getByRole('spinbutton', { name: 'My games' })).toHaveAttribute('aria-valuenow', '2')
    expect(screen.getByRole('spinbutton', { name: 'Their games' })).toHaveAttribute('aria-valuenow', '1')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Awaiting opponent')).toBeInTheDocument()
  })

  it('shows the final result once confirmed', () => {
    render(
      <ReportResult
        match={{ ...match, player1Games: 1, player2Games: 1, outcome: 'draw', status: 'confirmed' }}
        viewerId="misty"
        bestOf={3}
        onReport={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByText('Tie 1–1')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })
})
