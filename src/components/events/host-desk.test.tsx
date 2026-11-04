import { render, screen, within } from '@testing-library/react'
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
    plannedRounds: 0,
    deckRequired: false,
    bestOf: 3,
    pairingSystem: 'swiss',
    topCut: false,
    topCutSize: null,
    entriesClosedReason: null,
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

const entrants = (n: number): EventDetail['players'] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Trainer ${i + 1}`,
    username: null,
    image: null,
    isGuest: false,
    deckId: null,
    deckName: null,
    droppedAtRound: null,
    finalRank: null,
    seed: null,
  }))

const renderDesk = (detail: EventDetail) => {
  const onBestOf = vi.fn()
  const onPairingSystem = vi.fn()
  const onTopCut = vi.fn()
  const onDeckRequired = vi.fn()
  const onCut = vi.fn()
  const onFinish = vi.fn()
  const view = render(
    <HostDesk
      detail={detail}
      offsetMs={0}
      busy={false}
      onStartRound={vi.fn()}
      onFinish={onFinish}
      onCut={onCut}
      onClock={vi.fn()}
      onDeckRequired={onDeckRequired}
      onBestOf={onBestOf}
      onPairingSystem={onPairingSystem}
      onTopCut={onTopCut}
    />,
  )
  return { onBestOf, onPairingSystem, onTopCut, onDeckRequired, onCut, onFinish, view }
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

describe('HostDesk event setup', () => {
  it('groups pairing system, top cut, best of and deck required during registration', async () => {
    const { onPairingSystem, onTopCut } = renderDesk(detailWith({}))
    const setup = screen.getByRole('group', { name: 'Event setup' })
    expect(within(setup).getByRole('button', { name: 'Swiss' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(setup).getByRole('switch', { name: 'Top cut' })).not.toBeChecked()
    expect(within(setup).getByRole('button', { name: 'Best of 3' })).toBeInTheDocument()
    expect(within(setup).getByRole('switch', { name: 'Require a deck' })).toBeInTheDocument()
    await userEvent.click(within(setup).getByRole('button', { name: 'Round robin' }))
    expect(onPairingSystem).toHaveBeenCalledWith('round_robin')
    await userEvent.click(within(setup).getByRole('switch', { name: 'Top cut' }))
    expect(onTopCut).toHaveBeenCalledWith(true)
  })

  it('offers the top cut only under Swiss', () => {
    renderDesk(detailWith({ pairingSystem: 'single_elimination' }))
    expect(screen.queryByRole('switch', { name: 'Top cut' })).not.toBeInTheDocument()
  })

  it('disables the whole setup once round 1 starts', () => {
    renderDesk(detailWith({ status: 'running', currentRound: 1, topCut: true }))
    const setup = screen.getByRole('group', { name: 'Event setup' })
    for (const name of ['Swiss', 'Round robin', 'Single elimination', 'Best of 3']) {
      expect(within(setup).getByRole('button', { name })).toBeDisabled()
    }
    expect(within(setup).getByRole('switch', { name: 'Top cut' })).toHaveAttribute('aria-disabled', 'true')
    expect(within(setup).getByRole('switch', { name: 'Require a deck' })).toHaveAttribute('aria-disabled', 'true')
  })

  it.each([
    [{ pairingSystem: 'swiss', topCut: true }, 24, '5 Swiss rounds of 50 minutes, then top 8'],
    [{ pairingSystem: 'swiss', topCut: false }, 13, '4 Swiss rounds of 50 minutes'],
    [{ pairingSystem: 'swiss', topCut: true }, 6, '3 Swiss rounds of 50 minutes, top cut from 9 players'],
    [{ pairingSystem: 'round_robin', topCut: false }, 8, 'Round robin: 7 rounds of 50 minutes'],
    [
      { pairingSystem: 'single_elimination', topCut: false },
      8,
      'Single elimination: 3 rounds of 50 minutes, best of 3',
    ],
  ] as const)('shows the setup line for %o with %i players', (setup, players, line) => {
    renderDesk({ ...detailWith(setup), players: entrants(players) })
    expect(screen.getByText(line, { exact: false })).toBeInTheDocument()
  })

  it('updates the setup line as players join', () => {
    const { view } = renderDesk({ ...detailWith({ topCut: true }), players: entrants(12) })
    expect(screen.getByText('4 Swiss rounds of 50 minutes, then top 4', { exact: false })).toBeInTheDocument()
    view.rerender(
      <HostDesk
        detail={{ ...detailWith({ topCut: true }), players: entrants(21) }}
        offsetMs={0}
        busy={false}
        onStartRound={vi.fn()}
        onFinish={vi.fn()}
        onCut={vi.fn()}
        onClock={vi.fn()}
        onDeckRequired={vi.fn()}
        onBestOf={vi.fn()}
        onPairingSystem={vi.fn()}
        onTopCut={vi.fn()}
      />,
    )
    expect(screen.getByText('5 Swiss rounds of 50 minutes, then top 8', { exact: false })).toBeInTheDocument()
  })

  it('warns that a round robin of more than 10 players runs long', () => {
    const { view } = renderDesk({ ...detailWith({ pairingSystem: 'round_robin' }), players: entrants(10) })
    expect(screen.queryByText(/run long/)).not.toBeInTheDocument()
    view.unmount()
    renderDesk({ ...detailWith({ pairingSystem: 'round_robin' }), players: entrants(11) })
    expect(screen.getByText(/11 rounds.*run long/)).toBeInTheDocument()
  })
})

describe('HostDesk round robin', () => {
  const played = (round: number, status: 'confirmed' | 'playing'): EventDetail['matches'] =>
    [1, 2].map((table) => ({
      id: `m${round}-${table}`,
      roundNumber: round,
      table,
      player1: { id: `p${table}`, name: `Trainer ${table}`, username: null, image: null },
      player2: { id: `p${table + 2}`, name: `Trainer ${table + 2}`, username: null, image: null },
      player1Games: 2,
      player2Games: 0,
      outcome: status === 'confirmed' ? 'p1' : null,
      reportedById: null,
      bracketSlot: null,
      dropped: false,
      status,
    }))
  const running = (round: number, status: 'confirmed' | 'playing'): EventDetail => ({
    ...detailWith({ pairingSystem: 'round_robin', status: 'running', currentRound: round, plannedRounds: 7 }),
    players: entrants(8),
    rounds: [
      {
        id: `r${round}`,
        number: round,
        status: 'active',
        startedAt: 0,
        endsAt: 3_000_000,
        pausedRemainingMs: null,
        elimination: false,
      },
    ],
    matches: played(round, status),
  })

  it('warns during registration that pairing round 1 closes entries', () => {
    renderDesk({ ...detailWith({ pairingSystem: 'round_robin' }), players: entrants(4) })
    expect(screen.getByText(/Pairing round 1 draws the schedule and closes entries/)).toBeInTheDocument()
  })

  it('reads "Round 3 of 7" and pairs the next round of the schedule', () => {
    renderDesk(running(3, 'confirmed'))
    expect(screen.getByText('Round 3 of 7')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pair round 4' })).toBeEnabled()
  })

  it('ends with "Finish & publish standings" once the last round is confirmed', () => {
    renderDesk(running(7, 'confirmed'))
    expect(screen.getByText('Round 7 of 7')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finish & publish standings' })).toBeEnabled()
  })
})

describe('HostDesk single elimination', () => {
  const bracketRound = (round: number, status: 'confirmed' | 'playing', plannedRounds = 3): EventDetail => ({
    ...detailWith({ pairingSystem: 'single_elimination', status: 'running', currentRound: round, plannedRounds }),
    players: entrants(2 ** plannedRounds),
    rounds: Array.from({ length: round }, (_, i) => ({
      id: `r${i + 1}`,
      number: i + 1,
      status: i + 1 === round ? ('active' as const) : ('finished' as const),
      startedAt: 0,
      endsAt: 3_000_000,
      pausedRemainingMs: null,
      elimination: true,
    })),
    matches: [
      {
        id: `m${round}`,
        roundNumber: round,
        table: 1,
        player1: { id: 'p1', name: 'Trainer 1', username: null, image: null },
        player2: { id: 'p2', name: 'Trainer 2', username: null, image: null },
        player1Games: 2,
        player2Games: 0,
        outcome: status === 'confirmed' ? 'p1' : null,
        reportedById: null,
        bracketSlot: 0,
        dropped: false,
        status,
      },
    ],
  })

  it('warns during registration that pairing round 1 draws the seeds and closes entries', () => {
    renderDesk({ ...detailWith({ pairingSystem: 'single_elimination' }), players: entrants(5) })
    expect(screen.getByText(/Pairing round 1 draws the seeds and closes entries/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pair round 1' })).toBeEnabled()
  })

  it.each([
    [1, 3, 'Quarterfinal · Round 1 of 3', 'Pair semifinals'],
    [2, 3, 'Semifinal · Round 2 of 3', 'Pair final'],
    [2, 4, 'Quarterfinal · Round 2 of 4', 'Pair semifinals'],
    [1, 4, 'Round 1 of 4', 'Pair quarterfinals'],
  ] as const)('round %i of %i reads "%s" and pairs with "%s"', (round, planned, line, button) => {
    renderDesk(bracketRound(round, 'confirmed', planned))
    expect(screen.getByText(line)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: button })).toBeEnabled()
  })

  it('hides the early finish once the bracket has started', () => {
    renderDesk(bracketRound(1, 'confirmed'))
    expect(screen.queryByRole('button', { name: 'End event early' })).not.toBeInTheDocument()
  })

  it('finishes after the final', () => {
    renderDesk(bracketRound(3, 'confirmed'))
    expect(screen.getByText('Final · Round 3 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finish & publish standings' })).toBeEnabled()
  })
})

describe('HostDesk Swiss top cut', () => {
  /** A Swiss event with a top cut, 5 Swiss rounds, `playerCount` players and round `round` in play or confirmed. */
  const swissCut = (
    round: number,
    status: 'confirmed' | 'playing',
    {
      playerCount = 12,
      dropped = 0,
      topCutSize = null,
    }: { playerCount?: number; dropped?: number; topCutSize?: 2 | 4 | 8 | null } = {},
  ): EventDetail => ({
    ...detailWith({ topCut: true, topCutSize, status: 'running', currentRound: round, plannedRounds: 5 }),
    players: entrants(playerCount).map((p, i) => (i < dropped ? { ...p, droppedAtRound: 1 } : p)),
    rounds: Array.from({ length: round }, (_, i) => ({
      id: `r${i + 1}`,
      number: i + 1,
      status: i + 1 === round ? ('active' as const) : ('finished' as const),
      startedAt: 0,
      endsAt: 3_000_000,
      pausedRemainingMs: null,
      elimination: i + 1 > 5,
    })),
    matches: [
      {
        id: `m${round}`,
        roundNumber: round,
        table: 1,
        player1: { id: 'p1', name: 'Trainer 1', username: null, image: null },
        player2: { id: 'p2', name: 'Trainer 2', username: null, image: null },
        player1Games: 2,
        player2Games: 0,
        outcome: status === 'confirmed' ? 'p1' : null,
        reportedById: null,
        bracketSlot: round > 5 ? 0 : null,
        dropped: false,
        status,
      },
    ],
  })

  it('reads "Round 3 of 5 · then top cut" during the Swiss rounds', () => {
    renderDesk(swissCut(3, 'confirmed'))
    expect(screen.getByText('Round 3 of 5 · then top cut')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pair round 4' })).toBeEnabled()
  })

  it('after the last Swiss round the main button cuts to the default size, with finishing still available', async () => {
    const { onCut, onFinish } = renderDesk(swissCut(5, 'confirmed'))
    await userEvent.click(screen.getByRole('button', { name: 'Cut to top 4' }))
    expect(onCut).toHaveBeenCalledWith({ size: 4, roundMinutes: 50 })
    await userEvent.click(screen.getByRole('button', { name: 'Finish & publish standings' }))
    expect(onFinish).toHaveBeenCalled()
  })

  it('waits for the last Swiss round to be confirmed before cutting', () => {
    renderDesk(swissCut(5, 'playing'))
    expect(screen.getByRole('button', { name: 'Cut to top 4' })).toBeDisabled()
  })

  it('defaults to a top 8 from 21 players, even counting the dropped ones', () => {
    renderDesk(swissCut(5, 'confirmed', { playerCount: 21, dropped: 3 }))
    expect(screen.getByRole('button', { name: 'Cut to top 8' })).toBeEnabled()
  })

  it('lets the host change the cut size and the top cut round timer', async () => {
    const { onCut } = renderDesk(swissCut(5, 'confirmed'))
    await userEvent.click(screen.getByRole('button', { name: 'Top 8' }))
    const timer = screen.getByRole('spinbutton', { name: 'Top cut round timer (minutes)' })
    await userEvent.clear(timer)
    await userEvent.type(timer, '60')
    await userEvent.click(screen.getByRole('button', { name: 'Cut to top 8' }))
    expect(onCut).toHaveBeenCalledWith({ size: 8, roundMinutes: 60 })
  })

  it('offers no cut larger than the players who haven’t dropped', () => {
    renderDesk(swissCut(5, 'confirmed', { playerCount: 10, dropped: 3 }))
    expect(screen.getByRole('button', { name: 'Top 8' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Top 4' })).toBeEnabled()
  })

  it('below 9 players finishes by default, with a note and a quieter "Cut anyway"', async () => {
    const { onCut } = renderDesk(swissCut(5, 'confirmed', { playerCount: 8 }))
    expect(screen.getByRole('button', { name: 'Finish & publish standings' })).toBeEnabled()
    expect(screen.getByText(/Fewer than 9 players/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cut to top/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cut anyway' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cut to top 4' }))
    expect(onCut).toHaveBeenCalledWith({ size: 4, roundMinutes: 50 })
  })

  it.each([
    [6, 'Top 8 · Quarterfinal', 'Pair semifinals'],
    [7, 'Semifinal', 'Pair final'],
  ] as const)('top cut round %i reads "%s" and pairs with "%s"', (round, line, button) => {
    renderDesk(swissCut(round, 'confirmed', { topCutSize: 8 }))
    expect(screen.getByText(line)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: button })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'End event early' })).not.toBeInTheDocument()
  })

  it('finishes after the top cut final', () => {
    renderDesk(swissCut(8, 'confirmed', { topCutSize: 8 }))
    expect(screen.getByText('Final')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finish & publish standings' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /Cut to top/ })).not.toBeInTheDocument()
  })
})
