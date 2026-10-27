import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MatchView } from '#/server/events/views.ts'
import { PairingCard } from './pairing-card.tsx'

const match: MatchView = {
  id: 'm1',
  roundNumber: 2,
  table: 4,
  player1: { id: 'misty', name: 'Misty', username: null, image: null },
  player2: { id: 'ash', name: 'Ash', username: null, image: null },
  player1Games: 0,
  player2Games: 0,
  outcome: null,
  reportedById: null,
  status: 'playing',
}

describe('PairingCard', () => {
  it.each([1, 3, 5] as const)('tells the player the match is a best of %i', (bestOf) => {
    render(<PairingCard match={match} viewerId="ash" bestOf={bestOf} />)
    expect(screen.getByRole('region', { name: 'Round 2 pairing' })).toHaveTextContent(`Best of ${bestOf}`)
  })
})
