import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { bracketDetail } from '#/stories/fixtures.ts'
import { BracketScreen } from './bracket-screen.tsx'

const renderScreen = (detail = bracketDetail) =>
  render(<BracketScreen detail={detail} clock={<p>clock</p>} qr={<p>qr</p>} />)

describe('BracketScreen', () => {
  it('shows the current round’s tables large, with seeds, names, scores and status', () => {
    renderScreen()
    const now = within(screen.getByRole('region', { name: 'Now playing' }))
    expect(now.getByRole('heading', { name: 'Semifinal' })).toBeInTheDocument()
    const table2 = within(now.getByRole('listitem', { name: 'Table 2' }))
    expect(table2.getByText('Bruno Costa')).toBeInTheDocument()
    expect(table2.getByText('6')).toBeInTheDocument()
    expect(table2.getByText('Final')).toBeInTheDocument()
    expect(within(now.getByRole('listitem', { name: 'Table 1' })).getByText('Playing')).toBeInTheDocument()
  })

  it('shows the whole bracket beside them with the current round in orange', () => {
    renderScreen()
    const tree = within(screen.getByRole('region', { name: 'Bracket' }))
    expect(tree.getByText('Quarterfinal')).toHaveClass('text-paper-dim')
    expect(tree.getByText('Semifinal')).toHaveClass('text-orange')
    expect(tree.getByText('Winner of table 1')).toBeInTheDocument()
  })

  it('names the next match in the footer', () => {
    renderScreen()
    expect(screen.getByText('Final next: Bruno Costa vs the winner of table 1')).toBeInTheDocument()
  })

  it('names the champion once the event is finished', () => {
    const final = {
      ...bracketDetail.matches[4]!,
      id: 'r3-t1',
      roundNumber: 3,
      player2: bracketDetail.matches[5]!.player1,
      outcome: 'p2' as const,
      player1Games: 1,
      player2Games: 2,
      status: 'confirmed' as const,
    }
    renderScreen({
      ...bracketDetail,
      event: { ...bracketDetail.event, status: 'finished', currentRound: 3 },
      rounds: [...bracketDetail.rounds, { ...bracketDetail.rounds[1]!, id: 'r3', number: 3, status: 'finished' }],
      matches: [...bracketDetail.matches, final],
    })
    expect(screen.getByText('Champion: Bruno Costa')).toBeInTheDocument()
  })
})
