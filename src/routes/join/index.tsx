import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useCallback, useState } from 'react'
import { QrScanner } from '#/components/events/qr-scanner.tsx'
import { Page } from '#/components/layout/page.tsx'
import { Button } from '#/components/ui/button.tsx'
import { FieldError } from '#/components/ui/field.tsx'
import { Input } from '#/components/ui/input.tsx'
import { isJoinCode, JOIN_CODE_LENGTH, normalizeJoinCode } from '#/domain/ids.ts'

export const Route = createFileRoute('/join/')({
  head: () => ({ meta: [{ title: 'Join an event · tcgRank' }] }),
  component: JoinWithCode,
})

function JoinWithCode() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const go = useCallback((value: string) => navigate({ to: '/join/$code', params: { code: value } }), [navigate])

  return (
    <Page className="flex max-w-xl flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl">Join an event</h1>
        <p className="text-paper-dim">
          Point your phone camera at the QR code on the host&apos;s screen — or type the six-character code below.
        </p>
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!isJoinCode(code)) return setError(`Codes are ${JOIN_CODE_LENGTH} letters and numbers`)
          void go(code)
        }}
      >
        <label htmlFor="join-code" className="text-sm font-semibold">
          Event code
        </label>
        <div className="flex gap-2">
          <Input
            id="join-code"
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
            aria-label="Find event"
            disabled={code.length < JOIN_CODE_LENGTH}
          >
            <ArrowRight className="size-6" />
          </Button>
        </div>
        <FieldError>{error}</FieldError>
      </form>
      <QrScanner onCode={go} />
    </Page>
  )
}
