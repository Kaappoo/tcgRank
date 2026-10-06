import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useDebouncedValue } from '@tanstack/react-pacer'
import { CalendarPlus, Search } from 'lucide-react'
import { z } from 'zod'
import { EventRow } from '#/components/events/event-row.tsx'
import { EmptyState, Page, PageHeader } from '#/components/layout/page.tsx'
import { buttonVariants } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { Tabs, TabsList, TabsTab } from '#/components/ui/tabs.tsx'
import { eventsQuery, type EventScope } from '#/lib/queries.ts'

const search = z.object({
  scope: z.enum(['upcoming', 'live', 'finished', 'mine']).default('upcoming').catch('upcoming'),
  q: z.string().default('').catch(''),
})

export const Route = createFileRoute('/events/')({
  validateSearch: search,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(eventsQuery(deps.scope, deps.q)),
  head: () => ({ meta: [{ title: 'Events · tcgRank' }] }),
  component: EventsPage,
})

const SCOPES: ReadonlyArray<{ value: EventScope; label: string }> = [
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'finished', label: 'Results' },
  { value: 'mine', label: 'Mine' },
]

function EventsPage() {
  const { scope, q } = Route.useSearch()
  const { user } = Route.useRouteContext()
  const navigate = Route.useNavigate()
  // Debounce typing so we only hit the server once the player pauses.
  const [debouncedQ] = useDebouncedValue(q, { wait: 250 })
  const { data: events, isFetching } = useQuery({ ...eventsQuery(scope, debouncedQ), placeholderData: (prev) => prev })

  return (
    <Page>
      <PageHeader
        title="Events"
        description="League Challenges, Cups and casual nights at stores near you."
        actions={
          user ? (
            <Link to="/events/new" className={buttonVariants({ size: 'lg' })}>
              <CalendarPlus /> Host an event
            </Link>
          ) : null
        }
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Tabs
          value={scope}
          onValueChange={(value) => navigate({ search: (s) => ({ ...s, scope: value as EventScope }) })}
        >
          <TabsList>
            {SCOPES.filter((s) => s.value !== 'mine' || user).map((s) => (
              <TabsTab key={s.value} value={s.value}>
                {s.label}
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search events or stores</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-paper-dim" />
          <Input
            value={q}
            onChange={(e) => navigate({ search: (s) => ({ ...s, q: e.target.value }), replace: true })}
            placeholder="Search events or stores"
            className="pl-10"
          />
        </label>
      </div>

      {!events ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus />}
          title={q ? `Nothing matches “${q}”` : 'No events here yet'}
          description={
            scope === 'mine'
              ? 'Events you host or play in show up here.'
              : 'Ask your store to host on tcgRank — it takes a minute to set up.'
          }
          action={
            user ? (
              <Link to="/events/new" className={buttonVariants()}>
                Host an event
              </Link>
            ) : null
          }
        />
      ) : (
        <div className={`stagger -mx-3 flex flex-col transition-opacity sm:-mx-4 ${isFetching ? 'opacity-70' : ''}`}>
          {events.map((event, index) => (
            <div key={event.id} style={{ ['--i' as string]: index }}>
              <EventRow event={event} />
            </div>
          ))}
        </div>
      )}
    </Page>
  )
}
