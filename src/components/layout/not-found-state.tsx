import { Link } from '@tanstack/react-router'
import { buttonVariants } from '#/components/ui/button.tsx'
import { Page } from './page.tsx'

export function NotFoundState() {
  return (
    <Page className="flex min-h-[60vh] flex-col items-start justify-center gap-6">
      <p className="font-numerals text-8xl text-orange">404</p>
      <h1 className="font-display text-4xl sm:text-5xl">No one is sitting at this table.</h1>
      <p className="max-w-lg text-paper-dim">
        The page, event or deck you were looking for doesn&apos;t exist anymore.
      </p>
      <Link to="/events" className={buttonVariants({ size: 'lg' })}>
        Find an event
      </Link>
    </Page>
  )
}
