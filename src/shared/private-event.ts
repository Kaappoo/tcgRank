/**
 * What a private event answers someone who is not its host or an entrant and gave no join code.
 * Server failures reach the client as plain messages, so the event page recognises the prompt by this wording.
 */
export const CODE_REQUIRED_MESSAGE = 'This event is private. Enter its join code to see it.'

export const isCodeRequired = (error: unknown) => error instanceof Error && error.message === CODE_REQUIRED_MESSAGE
