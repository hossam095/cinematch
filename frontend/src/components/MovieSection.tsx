import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Movie } from '../types'
import { MovieCard } from './MovieCard'

interface Props {
  title: string
  subtitle?: string
  movies: Movie[]
  showSource?: boolean
  icon?: React.ReactNode
}

export function MovieSection({ title, subtitle, movies, showSource = false, icon }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' })
  }

  if (!movies || movies.length === 0) return null

  return (
    <section className="mb-10">
      <div className="flex items-end justify-between mb-4 px-4 sm:px-8">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="text-sm text-dark-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-dark-700 hover:bg-dark-600 text-white transition-colors"
            aria-label="Précédent"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-dark-700 hover:bg-dark-600 text-white transition-colors"
            aria-label="Suivant"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-8 pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} showSource={showSource} />
        ))}
      </div>
    </section>
  )
}
