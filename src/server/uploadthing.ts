import { createUploadthing, UploadThingError, type FileRouter } from 'uploadthing/server'
import { auth } from './auth.ts'

const f = createUploadthing()

const requireSession = async ({ req }: { req: Request }) => {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) throw new UploadThingError('Sign in to upload images')
  return { userId: session.user.id }
}

export const uploadRouter = {
  avatar: f({ image: { maxFileSize: '2MB', maxFileCount: 1 } })
    .middleware(requireSession)
    .onUploadComplete(({ file, metadata }) => ({ url: file.ufsUrl, userId: metadata.userId })),
  deckCover: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
    .middleware(requireSession)
    .onUploadComplete(({ file, metadata }) => ({ url: file.ufsUrl, userId: metadata.userId })),
} satisfies FileRouter

export type UploadRouter = typeof uploadRouter
