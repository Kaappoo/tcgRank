import { render, screen, waitFor } from '@testing-library/react'
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

    expect(onSetResult).toHaveBeenCalledWith('m1', 1, 2, expect.any(Function))
  })

  it('stays open while the correction is sent and shows why it was refused', async () => {
    const onSetResult = vi.fn()
    const { rerender } = render(<RoundTables matches={[reported]} bestOf={3} canEdit onSetResult={onSetResult} />)
    await openCorrection()
    await userEvent.click(await screen.findByRole('button', { name: 'Send result' }))
    expect(onSetResult).toHaveBeenCalledWith('m1', 2, 1, expect.any(Function))

    rerender(
      <RoundTables
        matches={[reported]}
        bestOf={3}
        canEdit
        onSetResult={onSetResult}
        correction={{ isPending: true, error: null }}
      />,
    )
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled()

    rerender(
      <RoundTables
        matches={[reported]}
        bestOf={3}
        canEdit
        onSetResult={onSetResult}
        correction={{ isPending: false, error: 'This round is closed' }}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('This round is closed')
    expect(screen.getByRole('spinbutton', { name: 'Misty' })).toBeInTheDocument()
  })

  it('closes once the correction is saved', async () => {
    render(<RoundTables matches={[reported]} bestOf={3} canEdit onSetResult={(_matchId, _p1, _p2, saved) => saved()} />)
    await openCorrection()
    await userEvent.click(await screen.findByRole('button', { name: 'Send result' }))
    await waitFor(() => expect(screen.queryByRole('spinbutton', { name: 'Misty' })).not.toBeInTheDocument())
  })

  it('does not show an earlier refusal when the dialog opens again', async () => {
    render(
      <RoundTables
        matches={[reported]}
        bestOf={3}
        canEdit
        onSetResult={vi.fn()}
        correction={{ isPending: false, error: 'This round is closed' }}
      />,
    )
    await openCorrection()
    await screen.findByRole('spinbutton', { name: 'Misty' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
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
    expect(onSetResult).toHaveBeenCalledWith('m1', 1, 0, expect.any(Function))
  })
})
