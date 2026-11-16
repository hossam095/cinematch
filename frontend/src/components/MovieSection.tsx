import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import type { Movie } from '../types'
import { MovieCard } from './MovieCard'

interface Props {
  title: string
  subtitle?: string
  movies: Movie[]
  showSource?: boolean
  icon?: React.ReactNode
  /** Optional "Voir tout" destination */
  link?: string
  /** Optional extra control rendered next to the arrows (e.g. a remove button) */
  action?: React.ReactNode
}

export function MovieSection({ title, subtitle, movies, showSource = false, icon, link, action }: Props) {
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
        <div className="flex items-center gap-2">
          {link && (
            <Link
              to={link}
              className="hidden sm:flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300 mr-2"
            >
              Voir tout
              <ArrowRight size={14} />
            </Link>
          )}
          {action}
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
