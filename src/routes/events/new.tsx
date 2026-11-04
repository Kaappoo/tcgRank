import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Page, PageHeader } from '#/components/layout/page.tsx'
import { Field, FieldError, FieldLabel } from '#/components/ui/field.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { toast } from '#/components/ui/toast.tsx'
import { DEFAULT_BEST_OF, type BestOf } from '#/domain/best-of.ts'
import { DEFAULT_PAIRING_SYSTEM } from '#/domain/event-setup.ts'
import { requireAuth } from '#/lib/guards.ts'
import type { EventFormat } from '#/server/db/schema.ts'
import { createEvent } from '#/server/functions/events.ts'
import { createEventInput } from '#/shared/schemas.ts'
import { SubmitButton } from '#/components/ui/submit-button.tsx'
import { fieldErrors } from '#/lib/form-errors.ts'
import { FormatField } from '#/components/forms/format-select.tsx'
import { BestOfField } from '#/components/forms/best-of-field.tsx'
import { SettingSwitch } from '#/components/forms/setting-switch.tsx'
import { EventSetupFields, type SetupDraft } from '#/components/events/event-setup-fields.tsx'
import { ToggleChip } from '#/components/ui/toggle-chip.tsx'

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
  const [deckRequired, setDeckRequired] = useState(false)
  const [bestOf, setBestOf] = useState<BestOf>(DEFAULT_BEST_OF)
  const [setup, setSetup] = useState<SetupDraft>({
    pairingSystem: DEFAULT_PAIRING_SYSTEM,
    topCut: false,
    plannedRounds: 0,
  })
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
            deckRequired,
            bestOf,
            ...setup,
            startsAt: new Date(String(form.get('startsAt'))),
          })
          if (!parsed.success) {
            setErrors(fieldErrors(parsed.error))
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
          <FormatField value={format} onChange={setFormat} />
          <BestOfField value={bestOf} onChange={setBestOf} />
        </div>
        <EventSetupFields value={setup} onChange={setSetup} roundsError={errors.plannedRounds} />
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold">Round timer</legend>
          <div className="flex flex-wrap items-center gap-2">
            {ROUND_PRESETS.map((m) => (
              <ToggleChip
                key={m}
                pressed={roundMinutes === m}
                onClick={() => setRoundMinutes(m)}
              >
                <span className="tabular">{m}</span> min
              </ToggleChip>
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
            Standard rounds usually get 25 minutes for a best of 1 and 50 for a best of 3. Everyone sees the same
            clock on their phone.
          </p>
          <FieldError>{errors.roundMinutes}</FieldError>
        </fieldset>
        <SettingSwitch
          title="Require a deck"
          description="Players must register a 60-card deck in this format to join. Otherwise they can skip it."
          checked={deckRequired}
          onChange={setDeckRequired}
        />
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
