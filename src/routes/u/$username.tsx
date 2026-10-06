import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { PencilLine, Share2, Trophy } from 'lucide-react'
import { DeckRow } from '#/components/decks/deck-row.tsx'
import { Page } from '#/components/layout/page.tsx'
import { MatchHistory } from '#/components/profile/match-history.tsx'
import { ResultsChart } from '#/components/profile/results-chart.tsx'
import { Avatar } from '#/components/ui/avatar.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Button, buttonVariants } from '#/components/ui/button.tsx'
import { LocalTime } from '#/components/ui/local-time.tsx'
import { Tabs, TabsList, TabsPanel, TabsTab } from '#/components/ui/tabs.tsx'
import { toast } from '#/components/ui/toast.tsx'
import { formatPercentage } from '#/domain/standings.ts'
import { profileQuery, userDecksQuery } from '#/lib/queries.ts'
import { absoluteUrl, seo } from '#/lib/seo.ts'

export const Route = createFileRoute('/u/$username')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(profileQuery(params.username)),
  head: ({ loaderData, params }) => ({
    meta: loaderData
      ? seo({
          title: `${loaderData.user.name} (@${loaderData.user.username}) · tcgRank`,
          description: `${loaderData.stats.wins}-${loaderData.stats.losses}-${loaderData.stats.draws} across ${loaderData.stats.eventsPlayed} events. ${formatPercentage(loaderData.stats.winRate)} win rate.`,
          image: absoluteUrl(`/api/og/player/${params.username}`),
        })
      : [],
  }),
  component: ProfilePage,
})

function ProfilePage() {
  const { username } = Route.useParams()
  const { user: viewer } = Route.useRouteContext()
  const { data: profile } = useSuspenseQuery(profileQuery(username))
  const { data: decks } = useQuery(userDecksQuery(profile.user.id))
  const { user, stats } = profile
  const isMe = viewer?.id === user.id

  return (
    <Page>
      <header className="relative isolate mb-10 flex flex-col gap-8 overflow-hidden rounded-2xl border border-line bg-surface p-6 sm:p-10">
        <div aria-hidden className="slab right-[-10%] hidden w-[20%] animate-slab sm:block" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:pr-[18%]">
          <Avatar name={user.name} src={user.image} size="xl" className="ring-4 ring-ink" />
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-display text-4xl sm:text-5xl">{user.name}</h1>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-paper-dim">
              <span>@{user.username}</span>
              {user.playerId ? <span className="tabular">Play! ID {user.playerId}</span> : null}
              <span>
                Since <LocalTime value={user.joinedAt} options={{ month: 'long', year: 'numeric' }} />
              </span>
            </p>
            {user.bio ? <p className="max-w-xl text-paper-dim">{user.bio}</p> : null}
          </div>
        </div>
        <div className="relative flex flex-col gap-6 border-t border-line pt-6 sm:mr-[18%] sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-paper-dim">Lifetime record</p>
            <p
              className="font-numerals text-7xl leading-none sm:text-8xl"
              aria-label={`${stats.wins} wins, ${stats.losses} losses, ${stats.draws} ties`}
            >
              {stats.wins}
              <span className="text-paper-dim">-</span>
              {stats.losses}
              <span className="text-paper-dim">-</span>
              {stats.draws}
            </p>
            <p className="text-sm text-paper-dim">
              <span className="font-semibold text-paper">{formatPercentage(stats.winRate)}</span> win rate across{' '}
              <span className="font-semibold text-paper">{stats.eventsPlayed}</span> events
              {stats.bestFinish ? (
                <>
                  {' '}
                  · best finish <span className="font-semibold text-orange">#{stats.bestFinish}</span>
                </>
              ) : null}
              {stats.eventsHosted > 0 ? <> · hosted {stats.eventsHosted}</> : null}
            </p>
          </div>
          <div className="flex gap-2">
            {isMe ? (
              <Link to="/settings" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                <PencilLine /> Edit profile
              </Link>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const url = window.location.href
                if (navigator.share) return navigator.share({ title: user.name, url }).catch(() => {})
                await navigator.clipboard.writeText(url)
                toast.success('Profile link copied')
              }}
            >
              <Share2 /> Share
            </Button>
          </div>
        </div>
      </header>

      <section className="mb-10 flex flex-col gap-4">
        <h2 className="font-display text-2xl">Results by event</h2>
        <div className="rounded-xl border border-line bg-surface p-4 sm:p-6">
          <ResultsChart events={profile.events} />
        </div>
      </section>

      <Tabs defaultValue="matches">
        <TabsList>
          <TabsTab value="matches">Matches</TabsTab>
          <TabsTab value="events">Events</TabsTab>
          <TabsTab value="decks">Decks</TabsTab>
        </TabsList>
        <TabsPanel value="matches">
          <MatchHistory matches={profile.matches} />
        </TabsPanel>
        <TabsPanel value="events">
          {profile.events.length === 0 ? (
            <p className="py-6 text-paper-dim">No events yet.</p>
          ) : (
            <ul className="stagger flex flex-col">
              {profile.events.map((e, index) => (
                <li key={e.eventId} style={{ ['--i' as string]: index }}>
                  <Link
                    to="/events/$eventId"
                    params={{ eventId: e.eventId }}
                    className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-4 border-b border-line/60 px-2 py-4 transition-colors hover:bg-surface"
                  >
                    <span className={`font-numerals text-4xl ${e.finalRank === 1 ? 'text-orange' : 'text-paper-dim'}`}>
                      {e.finalRank ? `#${e.finalRank}` : '—'}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-semibold">
                        {e.name} {e.finalRank === 1 ? <Trophy className="size-4 text-orange" /> : null}
                      </p>
                      <p className="truncate text-sm text-paper-dim">
                        {e.storeName} · <LocalTime value={e.startsAt} options={{ dateStyle: 'medium' }} /> ·{' '}
                        {e.playerCount} players
                      </p>
                    </div>
                    {e.status === 'finished' ? (
                      <span className="tabular text-sm">
                        {e.wins}-{e.losses}-{e.draws}
                      </span>
                    ) : (
                      <Badge variant={e.status === 'running' ? 'live' : 'outline'}>
                        {e.status === 'running' ? 'Live' : 'Registered'}
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsPanel>
        <TabsPanel value="decks">
          {!decks || decks.length === 0 ? (
            <p className="py-6 text-paper-dim">{isMe ? 'Public decks you save show up here.' : 'No public decks.'}</p>
          ) : (
            <div className="-mx-3 flex flex-col sm:-mx-4">
              {decks.map((d) => (
                <DeckRow key={d.id} deck={d} />
              ))}
            </div>
          )}
        </TabsPanel>
      </Tabs>
    </Page>
  )
}
