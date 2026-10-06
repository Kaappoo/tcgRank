import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Camera, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Page, PageHeader } from '#/components/layout/page.tsx'
import { Avatar } from '#/components/ui/avatar.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Field, FieldDescription, FieldError, FieldLabel } from '#/components/ui/field.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { toast } from '#/components/ui/toast.tsx'
import { requireAuth } from '#/lib/guards.ts'
import { myProfileQuery, sessionQuery } from '#/lib/queries.ts'
import { useUploadThing } from '#/lib/uploadthing.ts'
import { updateProfile } from '#/server/functions/profiles.ts'
import { profileInput } from '#/shared/schemas.ts'

export const Route = createFileRoute('/settings')({
  beforeLoad: requireAuth,
  loader: ({ context }) => context.queryClient.ensureQueryData(myProfileQuery),
  head: () => ({ meta: [{ title: 'Settings · tcgRank' }] }),
  component: Settings,
})

function Settings() {
  const { data: me } = useSuspenseQuery(myProfileQuery)
  const router = useRouter()
  const queryClient = useQueryClient()
  const update = useServerFn(updateProfile)
  const [image, setImage] = useState<string | null>(me.image)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { startUpload, isUploading } = useUploadThing('avatar', {
    onClientUploadComplete: (files) => setImage(files[0]?.ufsUrl ?? null),
    onUploadError: (error) => {
      toast.error('Upload failed', error.message)
    },
  })

  const save = useMutation({
    mutationFn: (data: Parameters<typeof update>[0]['data']) => update({ data }),
    onSuccess: async ({ username }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
      ])
      await router.invalidate()
      toast.success('Profile saved')
      await router.navigate({ to: '/u/$username', params: { username } })
    },
    onError: (error) => toast.error('Could not save', error.message),
  })

  return (
    <Page className="max-w-2xl">
      <PageHeader title="Settings" description="How you appear on pairings, standings and your public profile." />
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          const form = Object.fromEntries(new FormData(e.currentTarget))
          const parsed = profileInput.safeParse({ ...form, image })
          if (!parsed.success) {
            setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])))
            return
          }
          setErrors({})
          save.mutate(parsed.data)
        }}
      >
        <div className="flex items-center gap-5">
          <Avatar name={me.name} src={image} size="xl" />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line-strong px-4 py-2.5 text-sm font-semibold transition-colors hover:border-orange">
            {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            {isUploading ? 'Uploading…' : 'Change photo'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void startUpload([file])
              }}
            />
          </label>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field invalid={Boolean(errors.name)}>
            <FieldLabel>Display name</FieldLabel>
            <Input name="name" defaultValue={me.name} autoComplete="name" />
            <FieldError>{errors.name}</FieldError>
          </Field>
          <Field invalid={Boolean(errors.username)}>
            <FieldLabel>Username</FieldLabel>
            <Input name="username" defaultValue={me.username ?? ''} autoComplete="username" />
            <FieldError>{errors.username}</FieldError>
          </Field>
        </div>
        <Field invalid={Boolean(errors.playerId)}>
          <FieldLabel>Play! Pokémon player ID</FieldLabel>
          <Input name="playerId" defaultValue={me.playerId ?? ''} inputMode="numeric" placeholder="1234567" />
          <FieldDescription>Helps hosts report your results to official tournament software.</FieldDescription>
          <FieldError>{errors.playerId}</FieldError>
        </Field>
        <Field>
          <FieldLabel>Bio</FieldLabel>
          <Textarea
            name="bio"
            defaultValue={me.bio ?? ''}
            maxLength={240}
            placeholder="Lost Box enjoyer. Never misses a League Challenge."
          />
        </Field>
        <p className="text-sm text-paper-dim">Signed in as {me.email}</p>
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={save.isPending || isUploading}>
            {save.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </Page>
  )
}
