import { generateReactHelpers } from '@uploadthing/react'
import type { UploadRouter } from '#/server/uploadthing.ts'

export const { useUploadThing } = generateReactHelpers<UploadRouter>({ url: '/api/uploadthing' })
