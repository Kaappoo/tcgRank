export function PageSpinner() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-[50vh] items-center justify-center">
      <span className="relative block h-8 w-6 -skew-x-12 overflow-hidden rounded-[3px] bg-surface-raised">
        <span className="absolute inset-0 origin-bottom animate-[grow_900ms_var(--ease-out-expo)_infinite] bg-orange" />
      </span>
      <style>{`@keyframes grow{0%{transform:scaleY(0)}60%{transform:scaleY(1)}100%{transform:scaleY(1);opacity:0}}`}</style>
    </div>
  )
}
