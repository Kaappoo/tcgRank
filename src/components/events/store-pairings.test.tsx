import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { playingMatch } from '#/stories/fixtures.ts'
import { StorePairings } from './store-pairings.tsx'

describe('StorePairings', () => {
  it('lists every player alphabetically with a 30 px avatar and a sleeve-colour bar before the name', () => {
    const { container } = render(
      <StorePairings
        matches={[
          playingMatch,
          { ...playingMatch, id: 'bye', table: 8, player1: playingMatch.player2!, player2: null },
        ]}
      />,
    )
    const rows = screen.getAllByRole('listitem')
    expect(rows.map((r) => r.textContent)).toEqual([
      'Ash Ketchum vs Misty Waterflower7',
      'Misty Waterflower vs Ash Ketchum7',
      'Misty Waterflower vs Bye8',
    ])
    expect(
      [...container.querySelectorAll('[data-slot="avatar"] svg')].every((s) => s.getAttribute('width') === '30'),
    ).toBe(true)
    expect(container.querySelectorAll('[data-slot="sleeve"]')).toHaveLength(3)
  })
})
