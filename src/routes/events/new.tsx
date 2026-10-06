import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Page, PageHeader } from '#/components/layout/page.tsx'
import { Field, FieldDescription, FieldError, FieldLabel } from '#/components/ui/field.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Select } from '#/components/ui/select.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { toast } from '#/components/ui/toast.tsx'
import { recommendedRounds } from '#/domain/swiss.ts'
import { formatLabel } from '#/lib/format.ts'
import { requireAuth } from '#/lib/guards.ts'
import { EVENT_FORMATS, type EventFormat } from '#/server/db/schema.ts'
import { createEvent } from '#/server/functions/events.ts'
import { createEventInput } from '#/shared/schemas.ts'
import { SubmitButton } from '#/components/ui/submit-button.tsx'

export const Route = createFileRoute('/events/new')({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: 'Host an event · tcgRank' }] }),
  component: NewEvent,
})

const ROUND_PRESETS = [25, 30, 50, 60] as const

/** Local "YYYY-MM-DDTHH:mm" for the next round hour, the shape datetime-local wants. */
const nextHourLocal = () => {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`
}

function NewEvent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const create = useServerFn(createEvent)
  const [format, setFormat] = useState<EventFormat>('standard')
  const [roundMinutes, setRoundMinutes] = useState(50)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof create>[0]['data']) => create({ data }),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event created', 'Put the QR code on screen and let players scan in.')
      await navigate({ to: '/events/$eventId', params: { eventId: id } })
    },
    onError: (error) => toast.error('Could not create the event', error.message),
  })

  return (
    <Page className="max-w-3xl">
      <PageHeader
        title="Host an event"
        description="Set it up once. Players join by scanning your QR code and you pair rounds with one tap."
      />
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          const parsed = createEventInput.safeParse({
            ...Object.fromEntries(form),
            format,
            roundMinutes,
            startsAt: new Date(String(form.get('startsAt'))),
          })
          if (!parsed.success) {
            setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])))
            return
          }
          setErrors({})
          mutation.mutate(parsed.data)
        }}
      >
        <Field invalid={Boolean(errors.name)}>
          <FieldLabel>Event name</FieldLabel>
          <Input name="name" placeholder="Tuesday League Challenge" required />
          <FieldError>{errors.name}</FieldError>
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field invalid={Boolean(errors.storeName)}>
            <FieldLabel>Store</FieldLabel>
            <Input name="storeName" placeholder="Pallet Town Games" required />
            <FieldError>{errors.storeName}</FieldError>
          </Field>
          <Field invalid={Boolean(errors.startsAt)}>
            <FieldLabel>Starts</FieldLabel>
            <Input name="startsAt" type="datetime-local" defaultValue={nextHourLocal()} required />
            <FieldError>{errors.startsAt}</FieldError>
          </Field>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel>Format</FieldLabel>
            <Select
              value={format}
              onValueChange={(v) => v && setFormat(v)}
              options={EVENT_FORMATS.map((f) => ({ value: f, label: formatLabel(f) }))}
            />
          </Field>
          <Field invalid={Boolean(errors.plannedRounds)}>
            <FieldLabel>Swiss rounds</FieldLabel>
            <Input name="plannedRounds" type="number" min={0} max={12} defaultValue={0} inputMode="numeric" />
            <FieldDescription>
              Leave at 0 and we&apos;ll pick by attendance — e.g. {recommendedRounds(8)} rounds for 8 players,{' '}
              {recommendedRounds(16)} for 16.
            </FieldDescription>
            <FieldError>{errors.plannedRounds}</FieldError>
          </Field>
        </div>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold">Round timer</legend>
          <div className="flex flex-wrap items-center gap-2">
            {ROUND_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={roundMinutes === m}
                onClick={() => setRoundMinutes(m)}
                className="h-11 cursor-pointer rounded-lg border border-line-strong px-4 text-sm font-semibold transition-colors hover:border-paper-dim aria-pressed:border-orange aria-pressed:bg-orange aria-pressed:text-on-orange"
              >
                <span className="tabular">{m}</span> min
              </button>
            ))}
            <Input
              aria-label="Custom minutes"
              type="number"
              min={10}
              max={120}
              value={roundMinutes}
              onChange={(e) => setRoundMinutes(Number(e.target.value))}
              className="w-24"
            />
          </div>
          <p className="text-xs text-paper-dim">
            Best-of-three Standard rounds are usually 50 minutes. Everyone sees the same clock on their phone.
          </p>
          <FieldError>{errors.roundMinutes}</FieldError>
        </fieldset>
        <Field>
          <FieldLabel>Notes for players</FieldLabel>
          <Textarea name="description" placeholder="Entry fee, prizes, deck registration deadline…" />
        </Field>
        <div className="flex justify-end">
          <SubmitButton size="xl" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create event'}
          </SubmitButton>
        </div>
      </form>
    </Page>
  )
}
