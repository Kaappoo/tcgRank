import { createServerFn } from '@tanstack/react-start'
import {
  addGuestInput,
  claimCodeInput,
  clockInput,
  createEventInput,
  deckRequiredInput,
  eventIdInput,
  joinCodeInput,
  joinEventInput,
  listEventsInput,
  matchIdInput,
  removeGuestInput,
  reportResultInput,
} from '#/shared/schemas.ts'
import { runServerEffect } from '../effect/run.ts'
import { EventsService } from '../events/service.ts'

export const listEvents = createServerFn({ method: 'GET' })
  .validator(listEventsInput)
  .handler(({ data }) => runServerEffect(EventsService.use((s) => s.list(data))))

export const getEvent = createServerFn({ method: 'GET' })
  .validator(eventIdInput)
  .handler(({ data }) => runServerEffect(EventsService.use((s) => s.detail(data.eventId))))

export const getEventByCode = createServerFn({ method: 'GET' })
  .validator(joinCodeInput)
  .handler(({ data }) => runServerEffect(EventsService.use((s) => s.findByJoinCode(data.code))))

export const createEvent = createServerFn({ method: 'POST' })
  .validator(createEventInput)
  .handler(({ data }) => runServerEffect(EventsService.use((s) => s.create(data))))

export const joinEvent = createServerFn({ method: 'POST' })
  .validator(joinEventInput)
  .handler(({ data }) => runServerEffect(EventsService.use((s) => s.join(data.eventId, data.deckId))))

export const setDeckRequired = createServerFn({ method: 'POST' })
  .validator(deckRequiredInput)
  .handler(({ data }) =>
    runServerEffect(EventsService.use((s) => s.setDeckRequired(data.eventId, data.deckRequired))),
  )

export const leaveEvent = createServerFn({ method: 'POST' })
  .validator(eventIdInput)
  .handler(({ data }) => runServerEffect(EventsService.use((s) => s.leave(data.eventId))))

export const startNextRound = createServerFn({ method: 'POST' })
  .validator(eventIdInput)
  .handler(({ data }) => runServerEffect(EventsService.use((s) => s.startNextRound(data.eventId))))

export const finishEvent = createServerFn({ method: 'POST' })
  .validator(eventIdInput)
  .handler(({ data }) => runServerEffect(EventsService.use((s) => s.finishEvent(data.eventId))))

export const deleteEvent = createServerFn({ method: 'POST' })
  .validator(eventIdInput)
  .handler(({ data }) => runServerEffect(EventsService.use((s) => s.remove(data.eventId))))

export const reportResult = createServerFn({ method: 'POST' })
  .validator(reportResultInput)
  .handler(({ data }) =>
    runServerEffect(EventsService.use((s) => s.reportResult(data.matchId, data.player1Games, data.player2Games))),
  )

export const confirmResult = createServerFn({ method: 'POST' })
  .validator(matchIdInput)
  .handler(({ data }) => runServerEffect(EventsService.use((s) => s.confirmResult(data.matchId))))

export const controlClock = createServerFn({ method: 'POST' })
  .validator(clockInput)
  .handler(({ data }) =>
    runServerEffect(EventsService.use((s) => s.controlClock(data.eventId, data.action, data.deltaMinutes))),
  )

export const addGuest = createServerFn({ method: 'POST' })
  .validator(addGuestInput)
  .handler(({ data }) => runServerEffect(EventsService.use((s) => s.addGuest(data.eventId, data.guest))))

export const removeGuest = createServerFn({ method: 'POST' })
  .validator(removeGuestInput)
  .handler(({ data }) => runServerEffect(EventsService.use((s) => s.removeGuest(data.eventId, data.guestId))))

export const listMyGuests = createServerFn({ method: 'GET' }).handler(() =>
  runServerEffect(EventsService.use((s) => s.guests())),
)

export const getClaimPreview = createServerFn({ method: 'GET' })
  .validator(claimCodeInput)
  .handler(({ data }) => runServerEffect(EventsService.use((s) => s.claimPreview(data.code))))

export const claimGuest = createServerFn({ method: 'POST' })
  .validator(claimCodeInput)
  .handler(({ data }) => runServerEffect(EventsService.use((s) => s.claimGuest(data.code))))
