import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useEffect } from 'react'
import { toast } from '#/components/ui/toast.tsx'
import { isNetworkFailure, styleDraftStore, toInput, type StyleDraft } from '#/lib/style-draft.ts'
import { savePlayerStyle } from '#/server/functions/identity.ts'

/** Everything that shows a player's look reads again after a save. */
const refreshLook = (queryClient: ReturnType<typeof useQueryClient>) =>
  Promise.all(
    [['profile'], ['session'], ['style'], ['event']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  )

/**
 * Saves the customise draft. A save that never reaches the server (offline, dropped Wi-Fi) is kept on the phone as
 * pending and resolves as `'queued'`; `usePendingStyleSync` sends it once the connection is back.
 */
export function useSaveStyle(userId: string) {
  const queryClient = useQueryClient()
  const save = useServerFn(savePlayerStyle)
  return useMutation({
    mutationFn: async (draft: StyleDraft): Promise<'saved' | 'queued'> => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        styleDraftStore.save(userId, draft, true)
        return 'queued'
      }
      try {
        await save({ data: toInput(draft) })
      } catch (error) {
        if (!isNetworkFailure(error)) throw error
        styleDraftStore.save(userId, draft, true)
        return 'queued'
      }
      styleDraftStore.clear(userId)
      await refreshLook(queryClient)
      return 'saved'
    },
    networkMode: 'always',
  })
}

/** Sends a draft saved on this phone while offline, on app open and whenever the connection comes back. */
export function usePendingStyleSync(userId: string | null) {
  const queryClient = useQueryClient()
  const save = useServerFn(savePlayerStyle)
  useEffect(() => {
    if (!userId) return
    const flush = async () => {
      const stored = styleDraftStore.load(userId)
      if (!stored?.pending || !navigator.onLine) return
      try {
        await save({ data: toInput(stored.draft) })
        styleDraftStore.clear(userId)
        await refreshLook(queryClient)
        toast.success('Your new look is saved')
      } catch (error) {
        if (isNetworkFailure(error)) return
        styleDraftStore.save(userId, stored.draft, false)
        toast.error('Couldn’t save your new look', error instanceof Error ? error.message : undefined)
      }
    }
    void flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [userId, save, queryClient])
}
