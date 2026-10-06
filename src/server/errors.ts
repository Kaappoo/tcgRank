import { Schema } from 'effect'

export class NotFound extends Schema.TaggedError<NotFound>()('NotFound', {
  entity: Schema.String,
  id: Schema.String,
}) {
  override get message() {
    return `${this.entity} not found`
  }
}

export class Unauthenticated extends Schema.TaggedError<Unauthenticated>()('Unauthenticated', {}) {
  override get message() {
    return 'Sign in to continue'
  }
}

export class Forbidden extends Schema.TaggedError<Forbidden>()('Forbidden', {
  reason: Schema.String,
}) {
  override get message() {
    return this.reason
  }
}

/** The request is valid but the event/round/match is not in a state that allows it. */
export class InvalidState extends Schema.TaggedError<InvalidState>()('InvalidState', {
  reason: Schema.String,
}) {
  override get message() {
    return this.reason
  }
}

export class DatabaseError extends Schema.TaggedError<DatabaseError>()('DatabaseError', {
  cause: Schema.Defect(),
}) {
  override get message() {
    return 'Database request failed'
  }
}

export type AppError = NotFound | Unauthenticated | Forbidden | InvalidState | DatabaseError

export const httpStatusFor = (error: AppError): number => {
  switch (error._tag) {
    case 'NotFound':
      return 404
    case 'Unauthenticated':
      return 401
    case 'Forbidden':
      return 403
    case 'InvalidState':
      return 409
    case 'DatabaseError':
      return 500
  }
}
