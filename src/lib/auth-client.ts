import { createAuthClient } from 'better-auth/react'
import { magicLinkClient, usernameClient } from 'better-auth/client/plugins'

const authClient = createAuthClient({
  plugins: [usernameClient(), magicLinkClient()],
})

export const { signIn, signUp, signOut } = authClient
