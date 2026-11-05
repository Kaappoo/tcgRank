import { useNavigate, useSearch, type ErrorComponentProps } from '@tanstack/react-router'
import { Lock } from 'lucide-react'
import { JoinCodeForm } from '#/components/events/join-code-form.tsx'
import { ErrorState } from '#/components/layout/error-state.tsx'
import { Page } from '#/components/layout/page.tsx'
import { isCodeRequired } from '#/shared/private-event.ts'

/**
 * Error component for event routes. A private event, opened by someone who is not its host or an entrant,
 * asks for its join code; the code goes into the page's search, which opens the event. Any other failure
 * is the usual error.
 */
export function EventErrorState(props: ErrorComponentProps) {
  const navigate = useNavigate()
  const search: { code?: string } = useSearch({ strict: false })
  if (!isCodeRequired(props.error)) return <ErrorState {...props} />
  return (
    <Page className="flex max-w-xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-paper-dim">
          <Lock className="size-4" /> Private event
        </p>
        <h1 className="font-display text-5xl">Enter the join code</h1>
        <p className="text-paper-dim">
          The host keeps this event to players at the store. The code is on the store screen, or ask the host.
        </p>
      </div>
      <JoinCodeForm
        key={search.code}
        id="private-event-code"
        submitLabel="Open event"
        initialError={search.code ? "That code doesn't match this event" : null}
        onCode={(code) => void navigate({ to: '.', search: (prev) => ({ ...prev, code }) }).then(props.reset)}
      />
    </Page>
  )
}
