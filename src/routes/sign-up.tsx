import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { AuthShell } from '#/components/auth/auth-shell.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Field, FieldDescription, FieldError, FieldLabel } from '#/components/ui/field.tsx'
import { Input } from '#/components/ui/input.tsx'
import { signUp } from '#/lib/auth-client.ts'
import { sessionQuery } from '#/lib/queries.ts'

const search = z.object({ redirect: z.string().optional() })

const signUpForm = z.object({
  name: z.string().trim().min(2, 'Tell us your name'),
  username: z
    .string()
    .trim()
    .min(3, 'Usernames need at least 3 characters')
    .max(24)
    .regex(/^[a-z0-9_]+$/i, 'Letters, numbers and underscores only'),
  email: z.email('That email looks off'),
  password: z.string().min(8, 'Use at least 8 characters'),
})

export const Route = createFileRoute('/sign-up')({
  validateSearch: search,
  beforeLoad: ({ context, search }) => {
    if (context.user) throw redirect({ href: search.redirect ?? '/' })
  },
  head: () => ({ meta: [{ title: 'Create account · tcgRank' }] }),
  component: SignUp,
})

function SignUp() {
  const { redirect: redirectTo } = Route.useSearch()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<Partial<Record<keyof z.infer<typeof signUpForm> | 'form', string>>>({})
  const [pending, setPending] = useState(false)

  const onSubmit = async (form: FormData) => {
    const parsed = signUpForm.safeParse(Object.fromEntries(form))
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])))
      return
    }
    setErrors({})
    setPending(true)
    const { name, username, email, password } = parsed.data
    const result = await signUp.email({
      name,
      email,
      password,
      username: username.toLowerCase(),
      displayUsername: username,
    })
    setPending(false)
    if (result.error) return setErrors({ form: result.error.message ?? 'Could not create your account' })
    await queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey })
    await router.invalidate()
    await router.navigate({ href: redirectTo ?? '/' })
  }

  return (
    <AuthShell
      title="Create your trainer account"
      subtitle={
        <>
          Already playing?{' '}
          <Link to="/sign-in" search={{ redirect: redirectTo }} className="font-semibold text-orange hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form
        noValidate
        className="flex max-w-md flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          void onSubmit(new FormData(e.currentTarget))
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field invalid={Boolean(errors.name)}>
            <FieldLabel>Name</FieldLabel>
            <Input name="name" autoComplete="name" placeholder="Ash Ketchum" />
            <FieldError>{errors.name}</FieldError>
          </Field>
          <Field invalid={Boolean(errors.username)}>
            <FieldLabel>Username</FieldLabel>
            <Input name="username" autoComplete="username" placeholder="ash" />
            <FieldError>{errors.username}</FieldError>
          </Field>
        </div>
        <Field invalid={Boolean(errors.email)}>
          <FieldLabel>Email</FieldLabel>
          <Input name="email" type="email" autoComplete="email" placeholder="ash@pallet.town" />
          <FieldError>{errors.email}</FieldError>
        </Field>
        <Field invalid={Boolean(errors.password)}>
          <FieldLabel>Password</FieldLabel>
          <Input name="password" type="password" autoComplete="new-password" />
          <FieldDescription>At least 8 characters.</FieldDescription>
          <FieldError>{errors.password}</FieldError>
        </Field>
        <FieldError>{errors.form}</FieldError>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}
