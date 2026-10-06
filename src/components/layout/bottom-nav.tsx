import { Link, useRouteContext } from '@tanstack/react-router'
import { CalendarDays, Layers, QrCode, User } from 'lucide-react'

const tab =
  'flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold text-paper-dim transition-colors data-[status=active]:text-orange [&_svg]:size-5'

/** Thumb-reach navigation for phones at the table. The centre action is joining an event. */
export function BottomNav() {
  const { user } = useRouteContext({ from: '__root__' })

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex max-w-md items-end px-2">
        <Link to="/events" className={tab}>
          <CalendarDays />
          Events
        </Link>
        <Link to="/decks" className={tab}>
          <Layers />
          Decks
        </Link>
        <Link
          to="/join"
          className="-mt-5 flex flex-1 flex-col items-center gap-1 pb-2 text-[11px] font-semibold text-paper"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-orange text-on-orange shadow-[0_10px_30px_-10px_var(--orange)] transition-transform active:scale-95">
            <QrCode className="size-6" />
          </span>
          Join
        </Link>
        {user?.username ? (
          <Link to="/u/$username" params={{ username: user.username }} className={tab}>
            <User />
            Profile
          </Link>
        ) : (
          <Link to="/sign-in" className={tab}>
            <User />
            Sign in
          </Link>
        )}
      </div>
    </nav>
  )
}
