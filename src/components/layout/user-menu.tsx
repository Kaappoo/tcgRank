import { Menu } from '@base-ui/react/menu'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { Layers, LogOut, Settings, Trophy, User } from 'lucide-react'
import { Avatar } from '#/components/ui/avatar.tsx'
import { signOut } from '#/lib/auth-client.ts'
import type { SessionUser } from '#/server/current-user.ts'

const item =
  'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-paper outline-none select-none data-highlighted:bg-surface-raised [&_svg]:size-4 [&_svg]:text-paper-dim'

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const handleSignOut = async () => {
    await signOut()
    queryClient.clear()
    window.localStorage.removeItem('tcgrank-cache')
    await router.invalidate()
    await router.navigate({ to: '/' })
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Account menu"
        className="cursor-pointer rounded-full ring-offset-2 ring-offset-ink transition-shadow hover:ring-2 hover:ring-orange/60 focus-visible:ring-2 focus-visible:ring-orange"
      >
        <Avatar name={user.name} src={user.image} size="sm" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={10} align="end" className="z-50 outline-none">
          <Menu.Popup className="w-56 origin-(--transform-origin) rounded-lg border border-line bg-popover p-1 shadow-[0_24px_48px_-16px_rgb(0_0_0/0.7)] transition-[opacity,scale] duration-150 ease-out-expo data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              {user.username ? <p className="truncate text-xs text-paper-dim">@{user.username}</p> : null}
            </div>
            <Menu.Separator className="my-1 h-px bg-line" />
            {user.username ? (
              <Menu.Item className={item} render={<Link to="/u/$username" params={{ username: user.username }} />}>
                <User />
                Profile & history
              </Menu.Item>
            ) : null}
            <Menu.Item className={item} render={<Link to="/events" search={{ scope: 'mine' }} />}>
              <Trophy />
              My events
            </Menu.Item>
            <Menu.Item className={item} render={<Link to="/decks" />}>
              <Layers />
              Deck library
            </Menu.Item>
            <Menu.Item className={item} render={<Link to="/settings" />}>
              <Settings />
              Settings
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-line" />
            <Menu.Item className={item} onClick={handleSignOut}>
              <LogOut />
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
