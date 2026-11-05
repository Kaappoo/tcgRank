import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { JoinCodeForm } from '#/components/events/join-code-form.tsx'
import { QrScanner } from '#/components/events/qr-scanner.tsx'
import { Page } from '#/components/layout/page.tsx'

export const Route = createFileRoute('/join/')({
  head: () => ({ meta: [{ title: 'Join an event · tcgRank' }] }),
  component: JoinWithCode,
})

function JoinWithCode() {
  const navigate = useNavigate()

  const go = useCallback((value: string) => navigate({ to: '/join/$code', params: { code: value } }), [navigate])

  return (
    <Page className="flex max-w-xl flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl">Join an event</h1>
        <p className="text-paper-dim">
          Point your phone camera at the QR code on the host&apos;s screen — or type the six-character code below.
        </p>
      </div>
      <JoinCodeForm id="join-code" submitLabel="Find event" onCode={(code) => void go(code)} />
      <QrScanner onCode={go} />
    </Page>
  )
}
