import { Field, FieldLabel } from '#/components/ui/field.tsx'
import { Select } from '#/components/ui/select.tsx'
import { formatLabel } from '#/lib/format.ts'
import { EVENT_FORMATS, type EventFormat } from '#/server/db/schema.ts'

const OPTIONS = EVENT_FORMATS.map((f) => ({ value: f, label: formatLabel(f) }))

export function FormatField({ value, onChange }: { value: EventFormat; onChange: (format: EventFormat) => void }) {
  return (
    <Field>
      <FieldLabel>Format</FieldLabel>
      <Select value={value} onValueChange={(v) => v && onChange(v)} options={OPTIONS} />
    </Field>
  )
}
