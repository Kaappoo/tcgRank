import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { z } from 'zod'
import { CustomiseStudio, STUDIO_SLOTS } from '#/components/identity/customise-studio.tsx'
import { Page } from '#/components/layout/page.tsx'
import { toast } from '#/components/ui/toast.tsx'
import { useSaveStyle } from '#/hooks/use-save-style.ts'
import { requireAuth } from '#/lib/guards.ts'
import { styleEditorQuery } from '#/lib/queries.ts'

const search = z.object({
  slot: z.enum(STUDIO_SLOTS.map((s) => s.key) as [string, ...Array<string>]).optional(),
})

export const Route = createFileRoute('/customise')({
  validateSearch: search,
  beforeLoad: requireAuth,
  loader: ({ context }) => context.queryClient.ensureQueryData(styleEditorQuery),
  head: () => ({ meta: [{ title: 'Customise · tcgRank' }] }),
  component: Customise,
})

function Customise() {
  const { user } = Route.useRouteContext()
  const { slot } = Route.useSearch()
  const { data: editor } = useSuspenseQuery(styleEditorQuery)
  const router = useRouter()
  const save = useSaveStyle(user.id)

  const close = () =>
    user.username
      ? router.navigate({ to: '/u/$username', params: { username: user.username } })
      : router.navigate({ to: '/' })

  return (
    <Page className="max-w-3xl pt-0 sm:pt-6">
      <h1 className="sr-only">Customise</h1>
      <CustomiseStudio
        editor={editor}
        userId={user.id}
        name={user.name}
        initialSlot={slot as never}
        saving={save.isPending}
        onDone={(draft) =>
          save.mutate(draft, {
            onSuccess: async (result) => {
              if (result === 'queued') toast.show('Saved on this phone', 'It syncs when you’re back online.')
              else toast.success('Looking sharp')
              await close()
            },
            onError: (error) => toast.error('Couldn’t save', error.message),
          })
        }
      />
    </Page>
  )
}
