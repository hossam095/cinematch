import clsx from 'clsx'

interface Props {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
  size?: 'sm' | 'md'
  className?: string
}

/** Toggle pill used for every filter group on the Trouver page. */
export function Chip({ active = false, onClick, children, size = 'sm', className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border transition-colors whitespace-nowrap',
        size === 'sm' ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2',
        active
          ? 'bg-brand-500 border-brand-500 text-dark-950 font-semibold'
          : 'bg-dark-800 border-dark-700 text-dark-300 hover:text-white hover:border-dark-500',
        className
      )}
    >
      {children}
    </button>
  )
}
