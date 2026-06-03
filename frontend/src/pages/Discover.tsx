import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../services/api'
import { MovieCard } from '../components/MovieCard'

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime',
  'Drama', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
  'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western',
]

const SORT_OPTIONS = [
  { value: 'popularity', label: 'Popularité' },
  { value: 'rating', label: 'Note TMDB' },
  { value: 'year', label: 'Année' },
  { value: 'title', label: 'Titre' },
]

const LANGUAGES = [
  { value: '', label: 'Toutes' },
  { value: 'en', label: 'Anglais' },
  { value: 'fr', label: 'Français' },
  { value: 'ja', label: 'Japonais' },
  { value: 'ko', label: 'Coréen' },
  { value: 'es', label: 'Espagnol' },
  { value: 'pt', label: 'Portugais' },
]

export function Discover() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const search = searchParams.get('search') ?? ''
  const genre = searchParams.get('genre') ?? ''
  const sort = searchParams.get('sort') ?? 'popularity'
  const language = searchParams.get('language') ?? ''
  const runtimeMax = searchParams.get('runtime_max') ?? ''

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value)
    else p.delete(key)
    setSearchParams(p)
  }

  const queryParams: Record<string, string> = { sort, limit: '200' }
  if (search) queryParams.search = search
  if (genre) queryParams.genre = genre
  if (language) queryParams.language = language
  if (runtimeMax) queryParams.runtime_max = runtimeMax

  const { data: movies, isLoading } = useQuery({
    queryKey: ['discover', queryParams],
    queryFn: () => api.getMovies(queryParams),
  })

  return (
    <div className="min-h-screen bg-dark-950 pt-20 pb-16 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Découvrir</h1>

        {/* Search + filter toggle */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="Rechercher un film, réalisateur..."
              value={search}
              onChange={(e) => setParam('search', e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition"
            />
            {search && (
              <button onClick={() => setParam('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white">
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors text-sm font-medium',
              showFilters
                ? 'bg-brand-500 border-brand-500 text-black'
                : 'bg-dark-800 border-dark-700 text-dark-300 hover:text-white hover:border-dark-500'
            )}
          >
            <SlidersHorizontal size={16} />
            Filtres
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 mb-6 space-y-5">
            {/* Genres */}
            <div>
              <p className="text-sm font-semibold text-dark-300 mb-3">Genres</p>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => setParam('genre', genre === g ? '' : g)}
                    className={clsx(
                      'text-xs px-3 py-1.5 rounded-full border transition-colors',
                      genre === g
                        ? 'bg-brand-500 border-brand-500 text-black font-semibold'
                        : 'bg-dark-700 border-dark-600 text-dark-300 hover:text-white hover:border-dark-500'
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Sort */}
              <div>
                <p className="text-sm font-semibold text-dark-300 mb-2">Trier par</p>
                <select
                  value={sort}
                  onChange={(e) => setParam('sort', e.target.value)}
                  className="w-full bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Language */}
              <div>
                <p className="text-sm font-semibold text-dark-300 mb-2">Langue</p>
                <select
                  value={language}
                  onChange={(e) => setParam('language', e.target.value)}
                  className="w-full bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>

              {/* Runtime */}
              <div>
                <p className="text-sm font-semibold text-dark-300 mb-2">
                  Durée max{runtimeMax ? ` : ${runtimeMax} min` : ''}
                </p>
                <input
                  type="range"
                  min={60}
                  max={240}
                  step={10}
                  value={runtimeMax || 240}
                  onChange={(e) => setParam('runtime_max', e.target.value === '240' ? '' : e.target.value)}
                  className="w-full accent-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-dark-400">Recherche en cours...</p>
          </div>
        ) : (
          <>
            <p className="text-dark-500 text-sm mb-5">
              {movies?.length ?? 0} film{(movies?.length ?? 0) > 1 ? 's' : ''} trouvé{(movies?.length ?? 0) > 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {movies?.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
            {movies?.length === 0 && (
              <div className="text-center py-20">
                <p className="text-dark-400 text-lg">Aucun film trouvé</p>
                <p className="text-dark-600 text-sm mt-1">Essayez d'autres filtres</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
