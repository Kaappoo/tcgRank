import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MatchView } from '#/server/events/views.ts'
import { PairingCard } from './pairing-card.tsx'
import { defaultLook } from '#/domain/avatar-parts.ts'

const match: MatchView = {
  id: 'm1',
  roundNumber: 2,
  table: 4,
  player1: { id: 'misty', name: 'Misty', username: null, ...defaultLook('misty') },
  player2: { id: 'ash', name: 'Ash', username: null, ...defaultLook('ash') },
  player1Games: 0,
  player2Games: 0,
  outcome: null,
  reportedById: null,
  bracketSlot: null,
  dropped: false,
  status: 'playing',
}

describe('PairingCard', () => {
  it.each([1, 3, 5] as const)('tells the player the match is a best of %i', (bestOf) => {
    render(<PairingCard match={match} viewerId="ash" bestOf={bestOf} />)
    expect(screen.getByRole('region', { name: 'Round 2 pairing' })).toHaveTextContent(`Best of ${bestOf}`)
  })
})

describe('PairingCard identity', () => {
  it('shows both avatars, your opponent’s larger, with a sleeve stripe on each seat and their title', async () => {
    const titled = { ...match, player1: { ...match.player1, title: 'champion' as const, sleeveColour: 'red' } }
    const { container } = render(<PairingCard match={titled} viewerId="ash" bestOf={3} />)
    const avatars = [...container.querySelectorAll('[data-slot="avatar"] svg')]
    expect(avatars.map((svg) => svg.getAttribute('width'))).toEqual(['40', '56'])
    const sleeves = [...container.querySelectorAll('[data-slot="sleeve"]')] as Array<HTMLElement>
    expect(sleeves).toHaveLength(2)
    expect(sleeves[1]!.style.backgroundColor).toBe('rgb(194, 59, 59)')
    expect(screen.getByText('Champion')).toBeInTheDocument()
  })
})
