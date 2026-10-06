import { createAuthClient } from 'better-auth/react'
import { magicLinkClient, usernameClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [usernameClient(), magicLinkClient()],
})

export const { useSession, signIn, signUp, signOut } = authClient
