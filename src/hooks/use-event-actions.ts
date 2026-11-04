import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from '#/components/ui/toast.tsx'
import type { BestOf } from '#/domain/best-of.ts'
import type { PairingSystem, TopCutSize } from '#/domain/event-setup.ts'
import { roundPairedTitle } from '#/lib/format.ts'
import { eventQuery } from '#/lib/queries.ts'
import {
  addGuest,
  confirmResult,
  controlClock,
  cutToTop,
  finishEvent,
  joinEvent,
  leaveEvent,
  removeGuest,
  reportResult,
  setBestOf,
  setDeckRequired,
  setPairingSystem,
  setTopCut,
  startNextRound,
} from '#/server/functions/events.ts'

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong')

/** Every mutation a player or host can make on an event, wired to refresh the live view. */
export function useEventActions(eventId: string) {
  const queryClient = useQueryClient()
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: eventQuery(eventId).queryKey }),
      queryClient.invalidateQueries({ queryKey: ['events'] }),
      queryClient.invalidateQueries({ queryKey: ['guests'] }),
    ])
  const onError = (error: unknown) => toast.error("That didn't go through", errorMessage(error))

  const report = useServerFn(reportResult)
  const confirm = useServerFn(confirmResult)
  const start = useServerFn(startNextRound)
  const finish = useServerFn(finishEvent)
  const cut = useServerFn(cutToTop)
  const clock = useServerFn(controlClock)
  const join = useServerFn(joinEvent)
  const leave = useServerFn(leaveEvent)
  const deckRule = useServerFn(setDeckRequired)
  const bestOfRule = useServerFn(setBestOf)
  const pairingSystemRule = useServerFn(setPairingSystem)
  const topCutRule = useServerFn(setTopCut)
  const addGuestFn = useServerFn(addGuest)
  const removeGuestFn = useServerFn(removeGuest)

  return {
    report: useMutation({
      mutationFn: (input: { matchId: string; player1Games: number; player2Games: number }) => report({ data: input }),
      onSuccess: (match) =>
        refresh().then(() =>
          toast.success(
            match.status === 'confirmed' ? 'Result locked in' : 'Result sent',
            match.status === 'confirmed' ? undefined : 'Your opponent needs to confirm it on their phone.',
          ),
        ),
      onError,
    }),
    /** The host's correction from the round tables: its refusal is shown in the correction dialog, not a toast. */
    correct: useMutation({
      mutationFn: (input: { matchId: string; player1Games: number; player2Games: number }) => report({ data: input }),
      onSuccess: () => refresh().then(() => toast.success('Result locked in')),
    }),
    confirm: useMutation({
      mutationFn: (matchId: string) => confirm({ data: { matchId } }),
      onSuccess: () => refresh().then(() => toast.success('Result confirmed')),
      onError,
    }),
    startRound: useMutation({
      mutationFn: () => start({ data: { eventId } }),
      onSuccess: ({ roundNumber }) =>
        refresh().then(() => {
          // Named from the refreshed event, so a bracket round reads by its stage ("Semifinals are paired").
          const event = queryClient.getQueryData(eventQuery(eventId).queryKey)?.event
          const title = event ? roundPairedTitle({ ...event, currentRound: roundNumber }) : `Round ${roundNumber} is paired`
          toast.success(title, 'Players can see their table now.')
        }),
      onError,
    }),
    cut: useMutation({
      mutationFn: (input: { size: TopCutSize; roundMinutes: number }) => cut({ data: { eventId, ...input } }),
      onSuccess: (_, { size }) =>
        refresh().then(() =>
          toast.success(`Top ${size} is paired`, 'Entries are closed. Players can see their table now.'),
        ),
      onError,
    }),
    finish: useMutation({
      mutationFn: () => finish({ data: { eventId } }),
      onSuccess: () => refresh().then(() => toast.success('Event finished', 'Final standings are published.')),
      onError,
    }),
    clock: useMutation({
      mutationFn: (input: { action: 'pause' | 'resume' | 'adjust'; deltaMinutes?: number }) =>
        clock({ data: { eventId, ...input } }),
      onSuccess: refresh,
      onError,
    }),
    join: useMutation({
      mutationFn: (deckId?: string | null) => join({ data: { eventId, deckId } }),
      onSuccess: () =>
        refresh().then(() => toast.success("You're in", 'Pairings will show up here when the round starts.')),
      onError,
    }),
    deckRequired: useMutation({
      mutationFn: (deckRequired: boolean) => deckRule({ data: { eventId, deckRequired } }),
      onSuccess: refresh,
      onError,
    }),
    bestOf: useMutation({
      mutationFn: (bestOf: BestOf) => bestOfRule({ data: { eventId, bestOf } }),
      onSuccess: refresh,
      onError,
    }),
    pairingSystem: useMutation({
      mutationFn: (pairingSystem: PairingSystem) => pairingSystemRule({ data: { eventId, pairingSystem } }),
      onSuccess: refresh,
      onError,
    }),
    topCut: useMutation({
      mutationFn: (topCut: boolean) => topCutRule({ data: { eventId, topCut } }),
      onSuccess: refresh,
      onError,
    }),
    addGuest: useMutation({
      mutationFn: (guest: { name: string } | { guestId: string }) => addGuestFn({ data: { eventId, guest } }),
      onSuccess: () => refresh().then(() => toast.success('Player added')),
      onError,
    }),
    removeGuest: useMutation({
      mutationFn: (guestId: string) => removeGuestFn({ data: { eventId, guestId } }),
      onSuccess: refresh,
      onError,
    }),
    leave: useMutation({
      mutationFn: () => leave({ data: { eventId } }),
      onSuccess: () => refresh().then(() => toast.show('You left the event')),
      onError,
    }),
  }
}
