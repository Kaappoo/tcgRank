import { Config, Context, Effect, Layer, Ref, Schema } from 'effect'
import { Resend } from 'resend'

export class EmailError extends Schema.TaggedError<EmailError>()('EmailError', {
  cause: Schema.Defect(),
}) {}

export interface Email {
  readonly to: string
  readonly subject: string
  readonly html: string
  readonly text: string
}

export class Mailer extends Context.Service<
  Mailer,
  {
    send(email: Email): Effect.Effect<void, EmailError>
  }
>()('tcgrank/server/email/Mailer') {
  /** Sends through Resend; falls back to logging when no API key is configured (local dev). */
  static readonly layer = Layer.effect(
    Mailer,
    Effect.gen(function* () {
      const apiKey = yield* Config.String('RESEND_API_KEY').pipe(Config.withDefault(''))
      const from = yield* Config.String('EMAIL_FROM').pipe(Config.withDefault('tcgRank <league@tcgrank.app>'))

      if (!apiKey) {
        return Mailer.of({
          send: (email) => Effect.logInfo(`[mailer:dev] → ${email.to}: ${email.subject}\n${email.text}`),
        })
      }

      const resend = new Resend(apiKey)
      return Mailer.of({
        send: Effect.fn('Mailer.send')(function* (email: Email) {
          const result = yield* Effect.tryPromise({
            try: () => resend.emails.send({ from, ...email }),
            catch: (cause) => new EmailError({ cause }),
          })
          if (result.error) return yield* new EmailError({ cause: result.error })
        }),
      })
    }),
  )

  /** Captures outgoing mail in memory so tests can assert on it. */
  static readonly layerTest = (outbox: Ref.Ref<ReadonlyArray<Email>>) =>
    Layer.succeed(Mailer, Mailer.of({ send: (email) => Ref.update(outbox, (all) => [...all, email]) }))
}
