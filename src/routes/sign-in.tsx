import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { AuthShell } from '#/components/auth/auth-shell.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Field, FieldError, FieldLabel } from '#/components/ui/field.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Separator } from '#/components/ui/separator.tsx'
import { toast } from '#/components/ui/toast.tsx'
import { signIn } from '#/lib/auth-client.ts'
import { sessionQuery } from '#/lib/queries.ts'

const search = z.object({ redirect: z.string().optional() })

export const Route = createFileRoute('/sign-in')({
  validateSearch: search,
  beforeLoad: ({ context, search }) => {
    if (context.user) throw redirect({ href: search.redirect ?? '/' })
  },
  head: () => ({ meta: [{ title: 'Sign in · tcgRank' }] }),
  component: SignIn,
})

function SignIn() {
  const { redirect: redirectTo } = Route.useSearch()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [magicSent, setMagicSent] = useState(false)

  const done = async () => {
    await queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey })
    await router.invalidate()
    await router.navigate({ href: redirectTo ?? '/' })
  }

  const onSubmit = async (form: FormData) => {
    setPending(true)
    setError(null)
    const identifier = String(form.get('identifier') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const result = identifier.includes('@')
      ? await signIn.email({ email: identifier, password })
      : await signIn.username({ username: identifier, password })
    setPending(false)
    if (result.error) return setError(result.error.message ?? 'Wrong email/username or password')
    await done()
  }

  const sendMagicLink = async (email: string) => {
    if (!email.includes('@')) return setError('Enter your email above to get a sign-in link')
    setPending(true)
    const result = await signIn.magicLink({ email, callbackURL: redirectTo ?? '/' })
    setPending(false)
    if (result.error) return setError(result.error.message ?? 'Could not send the link')
    setMagicSent(true)
    toast.success('Check your inbox', `We sent a sign-in link to ${email}.`)
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle={
        <>
          New here?{' '}
          <Link to="/sign-up" search={{ redirect: redirectTo }} className="font-semibold text-orange hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form
        className="flex max-w-md flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          void onSubmit(new FormData(e.currentTarget))
        }}
      >
        <Field>
          <FieldLabel>Email or username</FieldLabel>
          <Input name="identifier" autoComplete="username" required placeholder="ash@pallet.town" />
        </Field>
        <Field>
          <div className="flex items-baseline justify-between">
            <FieldLabel>Password</FieldLabel>
          </div>
          <Input name="password" type="password" autoComplete="current-password" required minLength={8} />
        </Field>
        <FieldError>{error}</FieldError>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
        <div className="flex items-center gap-3 text-xs text-paper-dim">
          <Separator className="flex-1" /> or <Separator className="flex-1" />
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={pending || magicSent}
          onClick={(e) => {
            const form = e.currentTarget.form
            void sendMagicLink(String(new FormData(form!).get('identifier') ?? '').trim())
          }}
        >
          <Mail /> {magicSent ? 'Link sent — check your email' : 'Email me a sign-in link'}
        </Button>
      </form>
    </AuthShell>
  )
}
