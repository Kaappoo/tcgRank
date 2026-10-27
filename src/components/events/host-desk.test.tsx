import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { EventDetail } from '#/server/events/views.ts'
import { HostDesk } from './host-desk.tsx'

const detailWith = (event: Partial<EventDetail['event']>): EventDetail => ({
  event: {
    id: 'e1',
    name: 'Tuesday League Challenge',
    storeName: 'Pallet Town Games',
    format: 'standard',
    status: 'registration',
    startsAt: 0,
    currentRound: 0,
    plannedRounds: 3,
    deckRequired: false,
    bestOf: 3,
    playerCount: 0,
    host: { id: 'host', name: 'Oak', username: 'oak', image: null },
    description: null,
    joinCode: 'ABC234',
    roundMinutes: 50,
    finishedAt: null,
    ...event,
  },
  players: [],
  rounds: [],
  matches: [],
  standings: [],
  viewer: { userId: 'host', isHost: true, entry: null, currentMatch: null },
  serverNow: 0,
})

const renderDesk = (detail: EventDetail) => {
  const onBestOf = vi.fn()
  render(
    <HostDesk
      detail={detail}
      offsetMs={0}
      busy={false}
      onStartRound={vi.fn()}
      onFinish={vi.fn()}
      onClock={vi.fn()}
      onDeckRequired={vi.fn()}
      onBestOf={onBestOf}
    />,
  )
  return { onBestOf }
}

describe('HostDesk best of', () => {
  it('shows the current best of and lets the host change it during registration', async () => {
    const { onBestOf } = renderDesk(detailWith({ bestOf: 3 }))
    expect(screen.getByRole('button', { name: 'Best of 3' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Best of 5' }))
    expect(onBestOf).toHaveBeenCalledWith(5)
  })

  it('locks the best of once round 1 has started', () => {
    renderDesk(detailWith({ bestOf: 5, status: 'running', currentRound: 1 }))
    expect(screen.getByRole('button', { name: 'Best of 5' })).toHaveAttribute('aria-pressed', 'true')
    for (const n of [1, 3, 5]) expect(screen.getByRole('button', { name: `Best of ${n}` })).toBeDisabled()
    expect(screen.getByText('Fixed once round 1 starts.')).toBeInTheDocument()
  })
})
