import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { bracketDetail } from '#/stories/fixtures.ts'
import { BracketPath } from './bracket-path.tsx'

const yourPath = () => within(screen.getByRole('region', { name: 'Your path' }))
const tile = (stage: string) => within(yourPath().getByRole('listitem', { name: stage }))

describe('BracketPath, Your path', () => {
  it('shows a won round with the opponent and the viewer’s score', () => {
    render(<BracketPath detail={bracketDetail} viewerId="diego" />)
    expect(tile('Quarterfinal').getByText('vs Elisa')).toBeInTheDocument()
    expect(tile('Quarterfinal').getByText('W 2–1')).toBeInTheDocument()
  })
  it('shows the round being played with the table number in orange', () => {
    render(<BracketPath detail={bracketDetail} viewerId="diego" />)
    expect(tile('Semifinal').getByText('vs Ana')).toBeInTheDocument()
    expect(tile('Semifinal').getByText('Table 1')).toHaveClass('text-orange')
  })

  it('shows a round not paired yet as waiting, with the opponent once they are known', () => {
    render(<BracketPath detail={bracketDetail} viewerId="diego" />)
    expect(tile('Final').getByText('vs Bruno')).toBeInTheDocument()
    expect(tile('Final').getByText('Waiting')).toBeInTheDocument()
  })

  it('shows a bye', () => {
    render(<BracketPath detail={bracketDetail} viewerId="ana" />)
    expect(tile('Quarterfinal').getByText('Bye')).toBeInTheDocument()
  })

  it('is hidden for a player not in the bracket and for someone not entered', () => {
    const { rerender } = render(<BracketPath detail={bracketDetail} viewerId="host" />)
    expect(screen.queryByRole('region', { name: 'Your path' })).not.toBeInTheDocument()
    rerender(<BracketPath detail={bracketDetail} viewerId={null} />)
    expect(screen.queryByRole('region', { name: 'Your path' })).not.toBeInTheDocument()
  })

  it('marks the rounds after a loss as out', () => {
    render(<BracketPath detail={bracketDetail} viewerId="carla" />)
    expect(tile('Quarterfinal').getByText('L 1–2')).toBeInTheDocument()
    expect(tile('Semifinal').getByText('Out')).toBeInTheDocument()
    expect(tile('Final').getByText('Out')).toBeInTheDocument()
  })
})

describe('BracketPath, rounds', () => {
  it('lists each paired elimination round newest first, with byes and the viewer’s match', () => {
    render(<BracketPath detail={bracketDetail} viewerId="diego" />)
    const sections = screen.getAllByRole('region').filter((r) => r.getAttribute('aria-label') !== 'Your path')
    expect(sections.map((s) => s.getAttribute('aria-label'))).toEqual(['Semifinal', 'Quarterfinal'])
    expect(within(sections[1]!).getByText('Bye')).toBeInTheDocument()
    const mine = within(sections[0]!).getByText('Diego Alves').closest('li')
    expect(mine).toHaveClass('border-orange/50')
  })

  it('shows a match the loser dropped from', () => {
    const detail = {
      ...bracketDetail,
      matches: bracketDetail.matches.map((m) =>
        m.id === 'r2-t1' ? { ...m, outcome: 'p1' as const, status: 'confirmed' as const, dropped: true } : m,
      ),
    }
    render(<BracketPath detail={detail} viewerId="diego" />)
    expect(within(screen.getByRole('region', { name: 'Semifinal' })).getByText('Dropped')).toBeInTheDocument()
    expect(tile('Semifinal').getByText('Dropped')).toBeInTheDocument()
    expect(tile('Final').getByText('Out')).toBeInTheDocument()
  })
})
