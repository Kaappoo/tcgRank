import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '#/components/ui/button.tsx'
import { Page } from './page.tsx'

export function ErrorState({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <Page className="flex min-h-[60vh] flex-col items-start justify-center gap-6">
      <h1 className="font-display text-4xl sm:text-6xl">
        That didn&apos;t <span className="text-orange">load</span>.
      </h1>
      <p className="max-w-lg text-paper-dim">
        {error instanceof Error && error.message ? error.message : 'Something went wrong.'}
      </p>
      <Button
        size="lg"
        onClick={() => {
          reset()
          void router.invalidate()
        }}
      >
        Try again
      </Button>
    </Page>
  )
}
