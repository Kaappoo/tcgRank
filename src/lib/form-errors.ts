import type { z } from 'zod'

/** Flattens a Zod error into `{ field: firstMessage }` for inline form errors. */
export const fieldErrors = (error: z.ZodError): Record<string, string> =>
  Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message]))
