import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MatchView } from '#/server/events/views.ts'
import { RoundTables } from './round-tables.tsx'

const reported: MatchView = {
  id: 'm1',
  roundNumber: 2,
  table: 4,
  player1: { id: 'misty', name: 'Misty', username: 'misty', image: null },
  player2: { id: 'ash', name: 'Ash', username: 'ash', image: null },
  player1Games: 2,
  player2Games: 1,
  outcome: 'p1',
  reportedById: 'misty',
  status: 'reported',
}

const openCorrection = () => userEvent.click(screen.getByRole('button', { name: 'Set result for table 4' }))

describe('RoundTables host correction', () => {
  it('corrects a table through the steppers, prefilled with the stored score', async () => {
    const onSetResult = vi.fn()
    render(<RoundTables matches={[reported]} bestOf={3} canEdit onSetResult={onSetResult} />)
    await openCorrection()

    expect(await screen.findByRole('spinbutton', { name: 'Misty' })).toHaveAttribute('aria-valuenow', '2')
    expect(screen.getByRole('spinbutton', { name: 'Ash' })).toHaveAttribute('aria-valuenow', '1')
    expect(screen.getByRole('status')).toHaveTextContent('Misty wins 2–1')

    await userEvent.click(screen.getByRole('button', { name: 'Remove a game: Misty' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add a game: Ash' }))
    expect(screen.getByRole('status')).toHaveTextContent('Ash wins 2–1')
    await userEvent.click(screen.getByRole('button', { name: 'Send result' }))

    expect(onSetResult).toHaveBeenCalledWith('m1', 1, 2)
  })

  it('fits the steppers to the event’s best of', async () => {
    render(<RoundTables matches={[{ ...reported, player1Games: 0, player2Games: 0 }]} bestOf={5} canEdit />)
    await openCorrection()
    expect(await screen.findByRole('spinbutton', { name: 'Misty' })).toHaveAttribute('aria-valuemax', '3')
  })

  it('asks once more before sending an incomplete correction', async () => {
    const onSetResult = vi.fn()
    render(
      <RoundTables
        matches={[{ ...reported, player1Games: 1, player2Games: 0 }]}
        bestOf={3}
        canEdit
        onSetResult={onSetResult}
      />,
    )
    await openCorrection()
    await userEvent.click(await screen.findByRole('button', { name: 'Send result' }))
    expect(onSetResult).not.toHaveBeenCalled()
    expect(screen.getByText(/Not all games reported/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Send anyway' }))
    expect(onSetResult).toHaveBeenCalledWith('m1', 1, 0)
  })
})
