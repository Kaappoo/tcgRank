import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { Layers, Plus } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { DeckRow } from '#/components/decks/deck-row.tsx'
import { EmptyState, Page, PageHeader } from '#/components/layout/page.tsx'
import { buttonVariants } from '#/components/ui/button.tsx'
import { requireAuth } from '#/lib/guards.ts'
import { myDecksQuery } from '#/lib/queries.ts'

export const Route = createFileRoute('/decks/')({
  beforeLoad: requireAuth,
  loader: ({ context }) => context.queryClient.ensureQueryData(myDecksQuery),
  head: () => ({ meta: [{ title: 'Deck library · tcgRank' }] }),
  component: DeckLibrary,
})

function DeckLibrary() {
  const { data: decks } = useSuspenseQuery(myDecksQuery)
  const listRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  useLayoutEffect(() => setOffset(listRef.current?.offsetTop ?? 0), [])

  // Libraries grow every format rotation; only mount the rows on screen.
  const virtualizer = useWindowVirtualizer({
    count: decks.length,
    estimateSize: () => 104,
    overscan: 6,
    scrollMargin: offset,
  })

  return (
    <Page>
      <PageHeader
        title="Deck library"
        description="Every list you've played, ready to register when you scan into an event."
        actions={
          <Link to="/decks/new" className={buttonVariants({ size: 'lg' })}>
            <Plus /> New deck
          </Link>
        }
      />
      {decks.length === 0 ? (
        <EmptyState
          icon={<Layers />}
          title="No decks yet"
          description="Paste a list from Pokémon TCG Live and we'll sort it into Pokémon, Trainers and Energy."
          action={
            <Link to="/decks/new" className={buttonVariants()}>
              Add your first deck
            </Link>
          }
        />
      ) : (
        <div ref={listRef} className="relative -mx-3 sm:-mx-4" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute inset-x-0 top-0"
              style={{ transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)` }}
            >
              <DeckRow deck={decks[item.index]!} />
            </div>
          ))}
        </div>
      )}
    </Page>
  )
}
