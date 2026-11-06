import { queryOptions } from '@tanstack/react-query'
import { getDeck, listMyDecks, listUserDecks } from '#/server/functions/decks.ts'
import { getClaimPreview, getEvent, getEventByCode, listEvents, listMyGuests } from '#/server/functions/events.ts'
import { getAchievements, getStyleEditor, getUnseenUnlocks } from '#/server/functions/identity.ts'
import { getMyProfile, getProfile } from '#/server/functions/profiles.ts'
import { getSessionUser } from '#/server/functions/session.ts'

export type EventScope = 'upcoming' | 'live' | 'finished' | 'mine'

/** Queries flagged with `meta.persist` survive reloads and offline use (see lib/persist.ts). */
const persist = { persist: true } as const

export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: () => getSessionUser(),
  staleTime: 60_000,
})

export const eventsQuery = (scope: EventScope, search = '') =>
  queryOptions({
    queryKey: ['events', scope, search],
    queryFn: () => listEvents({ data: { scope, search: search || undefined } }),
    staleTime: 15_000,
  })

export const eventQuery = (eventId: string) =>
  queryOptions({
    queryKey: ['event', eventId],
    queryFn: () => getEvent({ data: { eventId } }),
    meta: persist,
    staleTime: 2_000,
    // Live events poll quickly so pairings, results and the clock stay in sync across phones.
    refetchInterval: (query) => (query.state.data?.event.status === 'running' ? 4_000 : 20_000),
  })

export const eventByCodeQuery = (code: string) =>
  queryOptions({
    queryKey: ['event-code', code],
    queryFn: () => getEventByCode({ data: { code } }),
    staleTime: 15_000,
    // The join screen shows the event setup, which the host can still change during registration.
    refetchInterval: (query) => (query.state.data?.status === 'registration' ? 20_000 : false),
  })

/** The signed-in host's guest list (players added without an account). */
export const myGuestsQuery = queryOptions({
  queryKey: ['guests', 'mine'],
  queryFn: () => listMyGuests(),
  staleTime: 30_000,
})

export const claimPreviewQuery = (code: string) =>
  queryOptions({
    queryKey: ['claim', code],
    queryFn: () => getClaimPreview({ data: { code } }),
  })

export const myDecksQuery = queryOptions({
  queryKey: ['decks', 'mine'],
  queryFn: () => listMyDecks(),
  meta: persist,
  staleTime: 60_000,
})

export const userDecksQuery = (userId: string) =>
  queryOptions({
    queryKey: ['decks', 'user', userId],
    queryFn: () => listUserDecks({ data: { userId } }),
    staleTime: 60_000,
  })

export const deckQuery = (deckId: string) =>
  queryOptions({
    queryKey: ['deck', deckId],
    queryFn: () => getDeck({ data: { deckId } }),
    meta: persist,
    staleTime: 60_000,
  })

export const profileQuery = (username: string) =>
  queryOptions({
    queryKey: ['profile', username.toLowerCase()],
    queryFn: () => getProfile({ data: { username } }),
    meta: persist,
    staleTime: 30_000,
  })

export const myProfileQuery = queryOptions({
  queryKey: ['profile', 'me'],
  queryFn: () => getMyProfile(),
  staleTime: 60_000,
})

export const achievementsQuery = (userId: string) =>
  queryOptions({
    queryKey: ['achievements', userId],
    queryFn: () => getAchievements({ data: { userId } }),
    staleTime: 60_000,
  })

/** The signed-in player's new unlocks: the celebration, the Profile-tab count and NEW tags. */
export const unseenUnlocksQuery = queryOptions({
  queryKey: ['unlocks', 'unseen'],
  queryFn: () => getUnseenUnlocks(),
  staleTime: 15_000,
})

/** The customise editor's data. Persisted so the editor opens offline. */
export const styleEditorQuery = queryOptions({
  queryKey: ['style', 'editor'],
  queryFn: () => getStyleEditor(),
  meta: persist,
  staleTime: 30_000,
})
