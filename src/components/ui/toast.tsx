import { Toast } from '@base-ui/react/toast'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

const toastManager = Toast.createToastManager()

type ToastTone = 'default' | 'success' | 'error'

/** Imperative helper usable from anywhere (mutations, event handlers). */
export const toast = {
  show: (title: string, description?: string, tone: ToastTone = 'default') =>
    toastManager.add({ title, description, type: tone }),
  success: (title: string, description?: string) => toastManager.add({ title, description, type: 'success' }),
  error: (title: string, description?: string) => toastManager.add({ title, description, type: 'error' }),
}

export function Toaster({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager} limit={3} timeout={4500}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[60] w-[calc(100vw-2rem)] sm:right-6 sm:bottom-6 sm:w-96">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

function ToastList() {
  const { toasts } = Toast.useToastManager()
  return toasts.map((t) => (
    <Toast.Root
      key={t.id}
      toast={t}
      className={[
        '[--gap:0.6rem] [--peek:0.6rem] [--scale:calc(max(0,1-(var(--toast-index)*0.08)))] [--shrink:calc(1-var(--scale))] [--height:var(--toast-frontmost-height,var(--toast-height))]',
        '[--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]',
        'absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom select-none overflow-hidden rounded-lg border border-line bg-surface-raised text-paper shadow-[0_18px_40px_-12px_rgb(0_0_0/0.75)]',
        '[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]',
        'data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--offset-y)))]',
        'data-starting-style:[transform:translateY(150%)] data-ending-style:opacity-0 data-limited:opacity-0',
        '[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]',
        'data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]',
        'h-[var(--height)] data-expanded:h-[var(--toast-height)] [transition:transform_0.5s_var(--ease-out-expo),opacity_0.4s,height_0.15s]',
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-[''] data-[type=success]:before:bg-win data-[type=error]:before:bg-loss data-[type=default]:before:bg-orange",
        "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
      ].join(' ')}
    >
      <Toast.Content className="flex items-start gap-3 py-3.5 pr-3 pl-5 transition-opacity duration-200 data-behind:opacity-0 data-expanded:opacity-100">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Toast.Title className="text-sm font-bold" />
          <Toast.Description className="text-sm text-paper-dim" />
        </div>
        <Toast.Close aria-label="Dismiss" className="cursor-pointer rounded p-1 text-paper-dim hover:text-paper">
          <X className="size-4" />
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ))
}
