import { createServerFn } from '@tanstack/react-start'
import { currentSessionUser } from '../effect/run.ts'

export const getSessionUser = createServerFn({ method: 'GET' }).handler(() => currentSessionUser())
