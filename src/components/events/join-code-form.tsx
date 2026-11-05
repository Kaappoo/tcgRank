import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button.tsx'
import { FieldError } from '#/components/ui/field.tsx'
import { Input } from '#/components/ui/input.tsx'
import { isJoinCode, JOIN_CODE_LENGTH, normalizeJoinCode } from '#/domain/ids.ts'

/** The big six-character join code field, normalised as it's typed. Calls `onCode` with a well-formed code. */
export function JoinCodeForm({
  id,
  submitLabel,
  initialError = null,
  onCode,
}: {
  readonly id: string
  /** Accessible name of the arrow button. */
  readonly submitLabel: string
  readonly initialError?: string | null
  readonly onCode: (code: string) => void
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(initialError)

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!isJoinCode(code)) return setError(`Codes are ${JOIN_CODE_LENGTH} letters and numbers`)
        onCode(code)
      }}
    >
      <label htmlFor={id} className="text-sm font-semibold">
        Event code
      </label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={code}
          onChange={(e) => {
            setError(null)
            setCode(normalizeJoinCode(e.target.value))
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="K7Q2XM"
          aria-invalid={Boolean(error)}
          className="font-numerals h-16 text-center text-4xl tracking-[0.3em] placeholder:tracking-[0.3em] md:text-4xl"
        />
        <Button
          type="submit"
          size="icon"
          className="size-16"
          aria-label={submitLabel}
          disabled={code.length < JOIN_CODE_LENGTH}
        >
          <ArrowRight className="size-6" />
        </Button>
      </div>
      <FieldError>{error}</FieldError>
    </form>
  )
}
