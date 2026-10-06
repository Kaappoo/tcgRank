import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { DeckForm } from '#/components/decks/deck-form.tsx'
import { Page, PageHeader } from '#/components/layout/page.tsx'
import { toast } from '#/components/ui/toast.tsx'
import { requireAuth } from '#/lib/guards.ts'
import { createDeck } from '#/server/functions/decks.ts'

export const Route = createFileRoute('/decks/new')({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: 'New deck · tcgRank' }] }),
  component: NewDeck,
})

function NewDeck() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const create = useServerFn(createDeck)
  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof create>[0]['data']) => create({ data }),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ['decks'] })
      toast.success('Deck saved')
      await navigate({ to: '/decks/$deckId', params: { deckId: id } })
    },
    onError: (error) => toast.error('Could not save the deck', error.message),
  })

  return (
    <Page>
      <PageHeader title="New deck" />
      <DeckForm submitLabel="Save deck" pending={mutation.isPending} onSubmit={(data) => mutation.mutate(data)} />
    </Page>
  )
}
