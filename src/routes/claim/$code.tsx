import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Page } from '#/components/layout/page.tsx'
import { Button } from '#/components/ui/button.tsx'
import { toast } from '#/components/ui/toast.tsx'
import { useHydrated } from '#/hooks/use-hydrated.ts'
import { claimPreviewQuery } from '#/lib/queries.ts'
import { claimGuest } from '#/server/functions/events.ts'

export const Route = createFileRoute('/claim/$code')({
  beforeLoad: ({ context, location }) => {
    // The claim goes to whoever is signed in, so make an account first and land back here.
    if (!context.user) throw redirect({ to: '/sign-up', search: { redirect: location.href } })
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(claimPreviewQuery(params.code)),
  head: () => ({ meta: [{ title: 'Claim your results · tcgRank' }] }),
  component: ClaimGuest,
})

/** A guest who now has an account moves the results the host recorded for them onto it. */
function ClaimGuest() {
  const { code } = Route.useParams()
  const { user } = Route.useRouteContext()
  const { data: preview } = useSuspenseQuery(claimPreviewQuery(code))
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const hydrated = useHydrated()
  const claim = useServerFn(claimGuest)
  const mutation = useMutation({
    mutationFn: () => claim({ data: { code } }),
    onSuccess: async ({ eventCount }) => {
      await queryClient.invalidateQueries()
      toast.success('Results claimed', `${eventCount} ${eventCount === 1 ? 'event is' : 'events are'} on your profile now.`)
      await (user?.username
        ? navigate({ to: '/u/$username', params: { username: user.username } })
        : navigate({ to: '/events' }))
    },
    onError: (error) => toast.error("That didn't go through", error instanceof Error ? error.message : undefined),
  })

  return (
    <Page className="flex max-w-xl flex-col gap-8">
      <div className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div aria-hidden className="slab right-[-22%] w-[40%] animate-slab" />
        <div className="relative flex flex-col gap-3 pr-[30%]">
          <h1 className="font-display text-4xl">Claim {preview.name}&apos;s results</h1>
          <p className="text-paper-dim">
            {preview.hostName ? `${preview.hostName} entered ${preview.name}` : `${preview.name} was entered`} as a
            guest in <span className="tabular text-paper">{preview.eventCount}</span>{' '}
            {preview.eventCount === 1 ? 'event' : 'events'}.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Button size="xl" disabled={!hydrated || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Claiming…' : 'Add them to my profile'}
        </Button>
        <p className="text-center text-sm text-paper-dim">
          Only claim results you played yourself. Not you?{' '}
          <Link to="/events" className="font-semibold text-orange hover:underline">
            Go back
          </Link>
        </p>
      </div>
    </Page>
  )
}

