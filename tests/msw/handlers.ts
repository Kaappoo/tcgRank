import type { RequestHandler } from 'msw'

/**
 * Default handlers for client tests. The client talks to no third-party APIs
 * (card art is resolved on the server when a deck is saved), so there are none;
 * tests add their own with `server.use(...)`.
 */
export const handlers: Array<RequestHandler> = []
