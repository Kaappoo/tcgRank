import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { PencilLine, Share2, Trophy } from 'lucide-react'
import { DeckRow } from '#/components/decks/deck-row.tsx'
import { Page } from '#/components/layout/page.tsx'
import { MatchHistory } from '#/components/profile/match-history.tsx'
import { ResultsChart } from '#/components/profile/results-chart.tsx'
import { AchievementsList, tierKey } from '#/components/identity/achievements-list.tsx'
import { FeatureDeckGhost, FeaturedDeckCard } from '#/components/identity/featured-deck-card.tsx'
import { CustomiseLink, TrainerCard } from '#/components/identity/trainer-card.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Button, buttonVariants } from '#/components/ui/button.tsx'
import { LocalTime } from '#/components/ui/local-time.tsx'
import { BADGE_COUNT } from '#/domain/achievements.ts'
import { Tabs, TabsList, TabsPanel, TabsTab } from '#/components/ui/tabs.tsx'
import { toast } from '#/components/ui/toast.tsx'
import { formatPercentage } from '#/domain/standings.ts'
import { achievementsQuery, profileQuery, unseenUnlocksQuery, userDecksQuery } from '#/lib/queries.ts'
import { markAchievementsSeen } from '#/server/functions/identity.ts'
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
  const [tab, setTab] = useState('matches')

  return (
    <Page>
      <TrainerCard className="mb-6" owner={isMe} player={{ ...user, ...profile.identity, title: user.title }}>
        <div className="flex flex-col gap-6 border-t border-line pt-6 sm:flex-row sm:items-end sm:justify-between">
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
            {isMe ? <CustomiseLink /> : null}
            {isMe ? (
              <Link to="/settings" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                <PencilLine /> Settings
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
      </TrainerCard>

      {profile.identity.featuredDeck ? (
        <FeaturedDeckCard deck={profile.identity.featuredDeck} className="mb-10" />
      ) : isMe ? (
        <FeatureDeckGhost className="mb-10" />
      ) : (
        <div className="mb-10" />
      )}

      <section className="mb-10 flex flex-col gap-4">
        <h2 className="font-display text-2xl">Results by event</h2>
        <div className="rounded-xl border border-line bg-surface p-4 sm:p-6">
          <ResultsChart events={profile.events} />
        </div>
      </section>

      <Tabs defaultValue="matches" onValueChange={(value) => setTab(String(value))}>
        <TabsList>
          <TabsTab value="matches">Matches</TabsTab>
          <TabsTab value="events">Events</TabsTab>
          <TabsTab value="decks">Decks</TabsTab>
          <TabsTab value="achievements">
            Achievements{' '}
            <span className="tabular text-paper-dim">
              {profile.identity.earnedCount}/{BADGE_COUNT}
            </span>
          </TabsTab>
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
                        {e.stage ? <span className="font-semibold text-paper">{e.stage} · </span> : null}
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
        <TabsPanel value="achievements">
          {tab === 'achievements' ? <AchievementsTab userId={user.id} owner={isMe} /> : null}
        </TabsPanel>
      </Tabs>
    </Page>
  )
}

/**
 * Loads the tab when opened. On the owner's own profile, opening it is what clears the new unlocks: the NEW tags
 * show on this visit, from the snapshot taken before the marker moves.
 */
function AchievementsTab({ userId, owner }: { userId: string; owner: boolean }) {
  const queryClient = useQueryClient()
  const { data } = useQuery(achievementsQuery(userId))
  const [fresh] = useState(
    () =>
      new Set(
        owner
          ? (queryClient.getQueryData(unseenUnlocksQuery.queryKey)?.unlocks ?? []).map((u) =>
              tierKey(u.achievement, u.tier),
            )
          : [],
      ),
  )
  const markSeen = useServerFn(markAchievementsSeen)
  useEffect(() => {
    if (!owner) return
    void markSeen().then(() => queryClient.invalidateQueries({ queryKey: unseenUnlocksQuery.queryKey }))
  }, [owner, markSeen, queryClient])
  if (!data) return <p className="py-6 text-paper-dim">Loading achievements…</p>
  return <AchievementsList data={data} fresh={fresh} />
}
