import { useDebouncedValue } from '@tanstack/react-pacer'
import { useState } from 'react'
import { Field, FieldDescription, FieldError, FieldLabel } from '#/components/ui/field.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Switch } from '#/components/ui/switch.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import type { EventFormat } from '#/server/db/schema.ts'
import { deckInput, type DeckInput } from '#/shared/schemas.ts'
import { CoverPicker } from './cover-picker.tsx'
import { DeckListView } from './deck-list-view.tsx'
import { SubmitButton } from '#/components/ui/submit-button.tsx'
import { fieldErrors } from '#/lib/form-errors.ts'
import { FormatField } from '#/components/forms/format-select.tsx'

const NO_IMAGES: Readonly<Record<string, string>> = {}

export interface DeckFormProps {
  readonly initial?: Partial<DeckInput>
  /** Art already stored for the deck being edited, so the preview shows it. */
  readonly cardImages?: Readonly<Record<string, string>>
  readonly submitLabel: string
  readonly pending?: boolean
  readonly onSubmit: (input: DeckInput) => void
}

export function DeckForm({ initial, cardImages, submitLabel, pending, onSubmit }: DeckFormProps) {
  const [list, setList] = useState(initial?.list ?? '')
  const [format, setFormat] = useState<EventFormat>(initial?.format ?? 'standard')
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? true)
  const [cover, setCover] = useState<string | null>(initial?.coverCard ?? null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Parsing on every keystroke is cheap, but re-rendering the preview is not — wait for a pause.
  const [previewList] = useDebouncedValue(list, { wait: 300 })

  return (
    <form
      noValidate
      className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
      onSubmit={(e) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        const parsed = deckInput.safeParse({
          name: form.get('name'),
          archetype: form.get('archetype') || undefined,
          list,
          format,
          isPublic,
          coverCard: cover,
        })
        if (!parsed.success) {
          setErrors(fieldErrors(parsed.error))
          return
        }
        setErrors({})
        onSubmit(parsed.data)
      }}
    >
      <div className="flex flex-col gap-6">
        <Field invalid={Boolean(errors.name)}>
          <FieldLabel>Deck name</FieldLabel>
          <Input name="name" defaultValue={initial?.name} placeholder="Dragapult ex — Cup list" />
          <FieldError>{errors.name}</FieldError>
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel>Archetype</FieldLabel>
            <Input name="archetype" defaultValue={initial?.archetype} placeholder="Dragapult / Dusknoir" />
          </Field>
          <FormatField value={format} onChange={setFormat} />
        </div>
        <Field invalid={Boolean(errors.list)}>
          <FieldLabel>Deck list</FieldLabel>
          <Textarea
            value={list}
            onChange={(e) => setList(e.target.value)}
            rows={14}
            spellCheck={false}
            placeholder={'Pokémon: 12\n4 Dreepy TWM 128\n…\nTrainer: 36\n4 Arven SVI 166\n…'}
            className="font-mono text-xs leading-6"
          />
          <FieldDescription>Paste the export from Pokémon TCG Live or Limitless.</FieldDescription>
          <FieldError>{errors.list}</FieldError>
        </Field>
        <CoverPicker list={previewList} cardImages={cardImages ?? NO_IMAGES} value={cover} onChange={setCover} />
        <label className="flex items-center justify-between gap-4 rounded-lg border border-line px-4 py-3">
          <span className="flex flex-col">
            <span className="text-sm font-semibold">Show on my profile</span>
            <span className="text-xs text-paper-dim">Private decks are only visible to you and event hosts.</span>
          </span>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </label>
        <SubmitButton size="xl" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </SubmitButton>
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-xl">Preview</h2>
        <div className="rounded-xl border border-line bg-surface p-5">
          {previewList.trim() ? (
            <DeckListView list={previewList} cardImages={cardImages} />
          ) : (
            <p className="py-10 text-center text-sm text-paper-dim">Your list shows up here as you paste it.</p>
          )}
        </div>
      </div>
    </form>
  )
}
