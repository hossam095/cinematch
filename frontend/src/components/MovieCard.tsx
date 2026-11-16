import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Star, Users, Sparkles, Tv } from 'lucide-react'
import clsx from 'clsx'
import { isSeries, type Movie } from '../types'
import { api } from '../services/api'
import { RatingStars } from './RatingStars'
import { useUserStore } from '../store/userStore'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface Props {
  movie: Movie
  showSource?: boolean
}

const sourceLabel: Record<string, { label: string; icon: React.ReactNode }> = {
  hybrid: { label: 'Pour toi', icon: <Sparkles size={12} /> },
  content: { label: 'Similaire', icon: <Star size={12} /> },
  collaborative: { label: 'Communauté', icon: <Users size={12} /> },
  popular: { label: 'Tendance', icon: <Star size={12} /> },
  contextual: { label: 'Ce soir', icon: <Clock size={12} /> },
}

export function MovieCard({ movie, showSource = false }: Props) {
  const [imgError, setImgError] = useState(false)
  const { user, localRatings, setLocalRating } = useUserStore()
  const queryClient = useQueryClient()

  const currentRating = localRatings[movie.id] ?? 0

  const rateMutation = useMutation({
    mutationFn: (rating: number) => api.rateMovie(user!.id, movie.id, rating),
    onSuccess: (_, rating) => {
      setLocalRating(movie.id, rating)
      queryClient.invalidateQueries({ queryKey: ['recommendations', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['sections', user?.id] })
    },
  })

  const posterSrc = imgError ? api.posterUrl(null) : api.posterUrl(movie.poster_path)
  const src = movie.source && showSource ? sourceLabel[movie.source] : null

  const genres = movie.genres.split(',').slice(0, 2)
  const series = isSeries(movie)

  return (
    <div className="group relative flex-shrink-0 w-40 sm:w-44 transition-transform duration-200 hover:-translate-y-1">
      <Link to={`/movie/${movie.id}`}>
        <div className="relative overflow-hidden rounded-card bg-dark-800 aspect-[2/3]">
          <img
            src={posterSrc}
            alt={movie.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-950/95 via-dark-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
            <p className="text-xs text-dark-200 line-clamp-3">{movie.synopsis}</p>
          </div>
          {/* Source badge */}
          {src && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-brand-600/90 text-dark-950 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              {src.icon}
              {src.label}
            </div>
          )}
          {/* Runtime (films) or seasons (series) */}
          <div className={clsx(
            'absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold',
            series ? 'bg-mint-400 text-dark-950' : 'bg-dark-950/85 text-dark-50'
          )}>
            {series ? (
              <>
                <Tv size={9} />
                {movie.seasons ?? 1} saison{(movie.seasons ?? 1) > 1 ? 's' : ''}
              </>
            ) : (
              <>
                <Clock size={9} />
                {movie.runtime}m
              </>
            )}
          </div>
        </div>
      </Link>

      <div className="mt-2 px-0.5">
        <Link to={`/movie/${movie.id}`}>
          <h3 className="text-sm font-semibold text-dark-50 line-clamp-1 hover:text-brand-400 transition-colors">
            {movie.title}
          </h3>
        </Link>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-dark-400 flex items-center gap-1.5">
            {movie.year}
            {series && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-mint-400">
                Série
              </span>
            )}
          </span>
          <div className="flex items-center gap-1">
            <Star size={11} className="fill-brand-400 text-brand-400" />
            <span className="text-xs text-dark-300">{movie.tmdb_rating.toFixed(1)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {genres.map((g) => (
            <span
              key={g}
              className="text-[10px] bg-dark-700 text-dark-300 px-1.5 py-0.5 rounded-full"
            >
              {g.trim()}
            </span>
          ))}
        </div>

        {user && (
          <div
            className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <RatingStars
              value={currentRating}
              size="sm"
              onChange={(r) => rateMutation.mutate(r)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
