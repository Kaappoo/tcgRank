import { redirect, type ParsedLocation } from '@tanstack/react-router'
import type { SessionUser } from '#/server/current-user.ts'

/** Route guard: bounce anonymous visitors to sign-in and bring them back afterwards. */
export function requireAuth({
  context,
  location,
}: {
  context: { user: SessionUser | null }
  location: ParsedLocation
}) {
  if (!context.user) {
    throw redirect({ to: '/sign-in', search: { redirect: location.href } })
  }
  return { user: context.user }
}
