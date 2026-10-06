import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Trash2 } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '#/components/ui/dialog.tsx'
import { toast } from '#/components/ui/toast.tsx'
import { deleteEvent } from '#/server/functions/events.ts'

/** Hosts can cancel an event while registration is still open. */
export function DeleteEventButton({ eventId, eventName }: { eventId: string; eventName: string }) {
  const remove = useServerFn(deleteEvent)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => remove({ data: { eventId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.show('Event cancelled')
      await navigate({ to: '/events', search: { scope: 'mine', q: '' } })
    },
    onError: (error) => toast.error('Could not cancel the event', error.message),
  })

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        <Trash2 /> Cancel event
      </DialogTrigger>
      <DialogContent
        title={`Cancel ${eventName}?`}
        description="Everyone who registered is removed. This can't be undone."
      >
        <div className="flex justify-end gap-2">
          <DialogClose render={<Button variant="ghost" />}>Keep it</DialogClose>
          <Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            Cancel event
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
