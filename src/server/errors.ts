import { Schema } from 'effect'
import { CODE_REQUIRED_MESSAGE } from '#/shared/private-event.ts'

export class NotFound extends Schema.TaggedError<NotFound>()('NotFound', {
  entity: Schema.String,
  id: Schema.String,
}) {
  // fallow-ignore-next-line unused-class-member
  override get message() {
    return `${this.entity} not found`
  }
}

export class Unauthenticated extends Schema.TaggedError<Unauthenticated>()('Unauthenticated', {}) {
  // fallow-ignore-next-line unused-class-member
  override get message() {
    return 'Sign in to continue'
  }
}

export class Forbidden extends Schema.TaggedError<Forbidden>()('Forbidden', {
  reason: Schema.String,
}) {
  // fallow-ignore-next-line unused-class-member
  override get message() {
    return this.reason
  }
}

/** The request is valid but the event/round/match is not in a state that allows it. */
export class InvalidState extends Schema.TaggedError<InvalidState>()('InvalidState', {
  reason: Schema.String,
}) {
  // fallow-ignore-next-line unused-class-member
  override get message() {
    return this.reason
  }
}

/** A private event, opened by someone who is not its host or an entrant and has not given its join code. */
export class CodeRequired extends Schema.TaggedError<CodeRequired>()('CodeRequired', {}) {
  // fallow-ignore-next-line unused-class-member
  override get message() {
    return CODE_REQUIRED_MESSAGE
  }
}

export class DatabaseError extends Schema.TaggedError<DatabaseError>()('DatabaseError', {
  cause: Schema.Defect(),
}) {
  // fallow-ignore-next-line unused-class-member
  override get message() {
    return 'Database request failed'
  }
}

export type AppError = NotFound | Unauthenticated | Forbidden | CodeRequired | InvalidState | DatabaseError

export const httpStatusFor = (error: AppError): number => {
  switch (error._tag) {
    case 'NotFound':
      return 404
    case 'Unauthenticated':
      return 401
    case 'Forbidden':
    case 'CodeRequired':
      return 403
    case 'InvalidState':
      return 409
    case 'DatabaseError':
      return 500
  }
}
