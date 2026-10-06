import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { deckIdInput, deckInput, updateDeckInput } from '#/shared/schemas.ts'
import { DecksService } from '../decks/service.ts'
import { runServerEffect } from '../effect/run.ts'

export const listMyDecks = createServerFn({ method: 'GET' }).handler(() =>
  runServerEffect(DecksService.use((s) => s.listMine())),
)

export const listUserDecks = createServerFn({ method: 'GET' })
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(({ data }) => runServerEffect(DecksService.use((s) => s.listPublic(data.userId))))

export const getDeck = createServerFn({ method: 'GET' })
  .validator(deckIdInput)
  .handler(({ data }) => runServerEffect(DecksService.use((s) => s.get(data.deckId))))

export const createDeck = createServerFn({ method: 'POST' })
  .validator(deckInput)
  .handler(({ data }) => runServerEffect(DecksService.use((s) => s.create(data))))

export const updateDeck = createServerFn({ method: 'POST' })
  .validator(updateDeckInput)
  .handler(({ data: { deckId, ...input } }) => runServerEffect(DecksService.use((s) => s.update(deckId, input))))

export const deleteDeck = createServerFn({ method: 'POST' })
  .validator(deckIdInput)
  .handler(({ data }) => runServerEffect(DecksService.use((s) => s.remove(data.deckId))))
