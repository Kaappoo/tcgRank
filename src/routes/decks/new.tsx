import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { DeckForm } from '#/components/decks/deck-form.tsx'
import { Page, PageHeader } from '#/components/layout/page.tsx'
import { toast } from '#/components/ui/toast.tsx'
import { requireAuth } from '#/lib/guards.ts'
import { createDeck } from '#/server/functions/decks.ts'

export const Route = createFileRoute('/decks/new')({
  /** `joinCode`: the deck is being made while joining that event, so go back there with it selected. */
  validateSearch: z.object({ joinCode: z.string().optional() }),
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: 'New deck · tcgRank' }] }),
  component: NewDeck,
})

function NewDeck() {
  const navigate = useNavigate()
  const { joinCode } = Route.useSearch()
  const queryClient = useQueryClient()
  const create = useServerFn(createDeck)
  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof create>[0]['data']) => create({ data }),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ['decks'] })
      toast.success('Deck saved')
      await (joinCode
        ? navigate({ to: '/join/$code', params: { code: joinCode }, search: { deck: id } })
        : navigate({ to: '/decks/$deckId', params: { deckId: id } }))
    },
    onError: (error) => toast.error('Could not save the deck', error.message),
  })

  return (
    <Page>
      <PageHeader
        title="New deck"
        description={joinCode ? "Save it and you'll go straight back to registering for the event." : undefined}
      />
      <DeckForm submitLabel="Save deck" pending={mutation.isPending} onSubmit={(data) => mutation.mutate(data)} />
    </Page>
  )
}
