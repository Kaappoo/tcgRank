import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Copy, PencilLine, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { DeckCover } from '#/components/decks/deck-cover.tsx'
import { DeckForm } from '#/components/decks/deck-form.tsx'
import { DeckListView } from '#/components/decks/deck-list-view.tsx'
import { Page, PageHeader } from '#/components/layout/page.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '#/components/ui/dialog.tsx'
import { toast } from '#/components/ui/toast.tsx'
import { formatLabel } from '#/lib/format.ts'
import { deckQuery } from '#/lib/queries.ts'
import { deleteDeck, updateDeck } from '#/server/functions/decks.ts'

export const Route = createFileRoute('/decks/$deckId')({
  validateSearch: z.object({ edit: z.boolean().optional() }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(deckQuery(params.deckId)),
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.name} · tcgRank` : 'Deck · tcgRank' }] }),
  component: DeckPage,
})

function DeckPage() {
  const { deckId } = Route.useParams()
  const { edit } = Route.useSearch()
  const { user } = Route.useRouteContext()
  const { data: deck } = useSuspenseQuery(deckQuery(deckId))
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const update = useServerFn(updateDeck)
  const remove = useServerFn(deleteDeck)
  const [copied, setCopied] = useState(false)
  const isOwner = user?.id === deck.owner.id

  const save = useMutation({
    mutationFn: (data: Parameters<typeof update>[0]['data']) => update({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['deck', deckId] })
      await queryClient.invalidateQueries({ queryKey: ['decks'] })
      toast.success('Deck updated')
      await navigate({ to: '.', search: {} })
    },
    onError: (error) => toast.error('Could not save', error.message),
  })

  const destroy = useMutation({
    mutationFn: () => remove({ data: { deckId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['decks'] })
      toast.show('Deck deleted')
      await navigate({ to: '/decks' })
    },
    onError: (error) => toast.error('Could not delete', error.message),
  })

  if (edit && isOwner) {
    return (
      <Page>
        <PageHeader title={`Edit ${deck.name}`} />
        <DeckForm
          initial={{ ...deck, archetype: deck.archetype ?? undefined }}
          cardImages={deck.cardImages}
          submitLabel="Save changes"
          pending={save.isPending}
          onSubmit={(input) => save.mutate({ deckId, ...input })}
        />
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        title={deck.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{formatLabel(deck.format)}</Badge>
            {deck.archetype ? <span>{deck.archetype}</span> : null}
            <span>
              by{' '}
              {deck.owner.username ? (
                <Link
                  to="/u/$username"
                  params={{ username: deck.owner.username }}
                  className="text-paper hover:text-orange"
                >
                  {deck.owner.name}
                </Link>
              ) : (
                deck.owner.name
              )}
            </span>
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(deck.list)
                setCopied(true)
                toast.success('List copied', 'Import it straight into Pokémon TCG Live.')
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              <Copy /> {copied ? 'Copied' : 'Copy list'}
            </Button>
            {isOwner ? (
              <>
                <Button variant="secondary" onClick={() => navigate({ to: '.', search: { edit: true } })}>
                  <PencilLine /> Edit
                </Button>
                <Dialog>
                  <DialogTrigger render={<Button variant="ghost" aria-label="Delete deck" />}>
                    <Trash2 />
                  </DialogTrigger>
                  <DialogContent title="Delete this deck?" description="Events where you played it keep their results.">
                    <div className="flex justify-end gap-2">
                      <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
                      <Button variant="destructive" disabled={destroy.isPending} onClick={() => destroy.mutate()}>
                        Delete deck
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : null}
          </>
        }
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <DeckListView list={deck.list} cardImages={deck.cardImages} defaultMode="visual" />
        <DeckCover deck={deck} className="hidden self-start lg:block" />
      </div>
    </Page>
  )
}
