import { useState } from 'react'
import { Star } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  value?: number
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function RatingStars({ value = 0, onChange, readonly = false, size = 'md' }: Props) {
  const [hovered, setHovered] = useState(0)

  const sizes = { sm: 14, md: 18, lg: 24 }
  const px = sizes[size]
  const display = hovered || value

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={clsx('transition-transform', !readonly && 'hover:scale-125 cursor-pointer')}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => !readonly && onChange?.(star)}
          aria-label={`${star} étoiles`}
        >
          <Star
            size={px}
            className={clsx(
              'transition-colors',
              star <= display
                ? 'fill-brand-400 text-brand-400'
                : 'fill-transparent text-dark-500'
            )}
          />
        </button>
      ))}
    </div>
  )
}
