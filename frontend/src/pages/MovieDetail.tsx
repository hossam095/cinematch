import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock, Star, Globe, Users, Film } from 'lucide-react'
import { api } from '../services/api'
import { useUserStore } from '../store/userStore'
import { RatingStars } from '../components/RatingStars'
import { MovieCard } from '../components/MovieCard'

const LANG_LABELS: Record<string, string> = {
  en: 'Anglais',
  fr: 'Français',
  ja: 'Japonais',
  ko: 'Coréen',
  es: 'Espagnol',
  pt: 'Portugais',
  de: 'Allemand',
}

export function MovieDetail() {
  const { id } = useParams<{ id: string }>()
  const movieId = Number(id)
  const [imgError, setImgError] = useState(false)
  const { user, localRatings, setLocalRating } = useUserStore()
  const queryClient = useQueryClient()

  const { data: movie, isLoading } = useQuery({
    queryKey: ['movie', movieId],
    queryFn: () => api.getMovie(movieId),
  })

  const { data: similar } = useQuery({
    queryKey: ['similar', movieId],
    queryFn: () => api.getSimilar(movieId),
    enabled: !!movie,
  })

  const rateMutation = useMutation({
    mutationFn: (rating: number) => api.rateMovie(user!.id, movieId, rating),
    onSuccess: (_, rating) => {
      setLocalRating(movieId, rating)
      queryClient.invalidateQueries({ queryKey: ['recommendations', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['sections', user?.id] })
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center pt-16">
        <Film size={32} className="text-brand-400 animate-pulse" />
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center pt-16">
        <p className="text-dark-400">Film introuvable.</p>
      </div>
    )
  }

  const currentRating = localRatings[movieId] ?? 0
  const genres = movie.genres.split(',')
  const castList = movie.cast.split(',').slice(0, 4)
  const posterSrc = imgError ? api.posterUrl(null) : api.posterUrl(movie.poster_path, 'w342')

  return (
    <div className="min-h-screen bg-dark-950 pt-16 pb-16">
      {/* Backdrop blur hero */}
      <div className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110"
          style={{ backgroundImage: `url(${api.posterUrl(movie.poster_path, 'w780')})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark-950/60 via-dark-950/80 to-dark-950" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-8 py-10">
          <Link
            to={-1 as unknown as string}
            className="inline-flex items-center gap-2 text-dark-400 hover:text-white transition-colors mb-8 text-sm"
          >
            <ArrowLeft size={16} />
            Retour
          </Link>

          <div className="flex flex-col sm:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0 w-48 mx-auto sm:mx-0">
              <img
                src={posterSrc}
                alt={movie.title}
                onError={() => setImgError(true)}
                className="w-full rounded-2xl shadow-2xl"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{movie.title}</h1>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-dark-400">
                <span>{movie.year}</span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {movie.runtime} min
                </span>
                <span className="flex items-center gap-1">
                  <Globe size={14} />
                  {LANG_LABELS[movie.language] ?? movie.language}
                </span>
                <span className="flex items-center gap-1 text-brand-400">
                  <Star size={14} className="fill-brand-400" />
                  {movie.tmdb_rating.toFixed(1)} TMDB
                </span>
                {movie.avg_user_rating && (
                  <span className="flex items-center gap-1 text-brand-300">
                    <Users size={14} />
                    {movie.avg_user_rating.toFixed(1)} ({movie.user_rating_count} avis)
                  </span>
                )}
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mt-4">
                {genres.map((g) => (
                  <Link
                    key={g}
                    to={`/discover?genre=${encodeURIComponent(g.trim())}`}
                    className="bg-dark-700 hover:bg-dark-600 text-dark-200 text-xs px-3 py-1 rounded-full transition-colors"
                  >
                    {g.trim()}
                  </Link>
                ))}
              </div>

              {/* Synopsis */}
              <p className="mt-5 text-dark-300 leading-relaxed">{movie.synopsis}</p>

              {/* Director */}
              <div className="mt-5 text-sm">
                <span className="text-dark-500">Réalisateur · </span>
                <span className="text-white">{movie.director}</span>
              </div>

              {/* Cast */}
              <div className="mt-2 text-sm">
                <span className="text-dark-500">Avec · </span>
                <span className="text-white">{castList.join(', ')}</span>
              </div>

              {/* User rating */}
              {user ? (
                <div className="mt-6 p-4 bg-dark-800/60 rounded-xl border border-dark-700 inline-block">
                  <p className="text-sm text-dark-400 mb-2">Votre note</p>
                  <RatingStars
                    value={currentRating}
                    size="lg"
                    onChange={(r) => rateMutation.mutate(r)}
                  />
                  {currentRating > 0 && (
                    <p className="text-xs text-dark-500 mt-1">
                      {currentRating === 5 ? 'Chef-d\'œuvre !' :
                       currentRating === 4 ? 'Très bon' :
                       currentRating === 3 ? 'Bien' :
                       currentRating === 2 ? 'Moyen' : 'Décevant'}
                    </p>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="inline-block mt-6 text-sm text-brand-400 hover:text-brand-300 underline"
                >
                  Connectez-vous pour noter ce film
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Similar movies */}
      {similar && similar.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 sm:px-8 mt-6">
          <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
            <Film size={20} className="text-brand-400" />
            Films similaires
          </h2>
          <div
            className="flex gap-4 overflow-x-auto pb-4"
            style={{ scrollbarWidth: 'none' }}
          >
            {similar.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
