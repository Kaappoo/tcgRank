import { QueryClient } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { useEventActions } from '#/hooks/use-event-actions.ts'
import { myDecksQuery } from '#/lib/queries.ts'
import type { DeckView } from '#/server/decks/service.ts'
import type { EntrantView, EventDetail } from '#/server/events/views.ts'
import { renderWithRouter } from '../../../tests/render.tsx'
import { EntryPanel } from './entry-panel.tsx'

const me = { id: 'u1', name: 'Ash', username: 'ash', image: null }

const deck: DeckView = {
  id: 'deck-1',
  name: 'Dragapult ex',
  format: 'standard',
  archetype: null,
  list: '4 Dreepy TWM 128',
  cardCount: 60,
  coverCard: null,
  cardImages: {},
  isPublic: true,
  updatedAt: 0,
  owner: me,
}

const detailWith = (event: Partial<EventDetail['event']>, entry: EntrantView | null): EventDetail => ({
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
    playerCount: 1,
    host: { id: 'host', name: 'Oak', username: 'oak', image: null },
    description: null,
    joinCode: 'ABC234',
    roundMinutes: 50,
    finishedAt: null,
    ...event,
  },
  players: entry ? [entry] : [],
  rounds: [],
  matches: [],
  standings: [],
  viewer: { userId: me.id, isHost: false, entry, currentMatch: null },
  serverNow: 0,
})

const entrant = (deckId: string | null): EntrantView => ({
  ...me,
  deckId,
  deckName: deckId ? deck.name : null,
  droppedAtRound: null,
  finalRank: null,
})

const fakeActions = () => {
  const join = vi.fn()
  const actions = { join: { mutate: join }, leave: { mutate: vi.fn() } } as unknown as ReturnType<
    typeof useEventActions
  >
  return { actions, join }
}

const renderPanel = (detail: EventDetail, actions: ReturnType<typeof useEventActions>) => {
  const client = new QueryClient()
  client.setQueryData(myDecksQuery.queryKey, [deck])
  return renderWithRouter(<EntryPanel detail={detail} signedIn busy={false} actions={actions} />, client)
}

describe('EntryPanel', () => {
  it('asks a newcomer to choose a deck or skip before joining', async () => {
    const { actions, join } = fakeActions()
    await renderPanel(detailWith({}, null), actions)
    const joinButton = screen.getByRole('button', { name: 'Join event' })
    expect(joinButton).toBeDisabled()
    await userEvent.click(screen.getByRole('radio', { name: /Skip/ }))
    await userEvent.click(joinButton)
    expect(join).toHaveBeenCalledWith(null)
  })

  it('prompts a registered player without a deck once the host requires one', async () => {
    const { actions, join } = fakeActions()
    await renderPanel(detailWith({ deckRequired: true, status: 'running', currentRound: 1 }, entrant(null)), actions)
    expect(screen.getByRole('heading', { name: 'Register your deck' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /Skip/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /Dragapult ex/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Register deck' }))
    expect(join).toHaveBeenCalledWith('deck-1')
  })

  it('only offers dropping once rounds run with a deck registered', async () => {
    const { actions } = fakeActions()
    await renderPanel(detailWith({ status: 'running', currentRound: 1 }, entrant('deck-1')), actions)
    expect(screen.getByRole('button', { name: 'Drop from event' })).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })
})
