import { describe, expect, it } from '@effect/vitest'
import { Effect, Ref } from 'effect'
import { Mailer, type Email } from './mailer.ts'
import { magicLinkEmail, resetPasswordEmail, verifyEmail } from './templates.ts'

describe('Mailer', () => {
  it.effect('sends branded transactional emails', () =>
    Effect.gen(function* () {
      const outbox = yield* Ref.make<ReadonlyArray<Email>>([])
      const send = (email: Email) => Mailer.use((m) => m.send(email)).pipe(Effect.provide(Mailer.layerTest(outbox)))

      yield* send(magicLinkEmail('ash@pallet.town', 'https://tcgrank.app/api/auth/magic-link?token=abc'))
      yield* send(resetPasswordEmail('ash@pallet.town', 'https://tcgrank.app/reset?token=def'))
      yield* send(verifyEmail('ash@pallet.town', 'https://tcgrank.app/verify?token=ghi'))

      const sent = yield* Ref.get(outbox)
      expect(sent.map((e) => e.subject)).toEqual([
        'Your tcgRank sign-in link',
        'Reset your tcgRank password',
        'Confirm your email for tcgRank',
      ])
      expect(sent[0]?.html).toContain('href="https://tcgrank.app/api/auth/magic-link?token=abc"')
      expect(sent[0]?.text).toContain('expires in 5 minutes')
    }),
  )

  it('escapes user-controlled values in HTML', () => {
    const email = magicLinkEmail('x@y.z', 'https://evil.test/"><script>alert(1)</script>')
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&quot;&gt;&lt;script&gt;')
  })
})
