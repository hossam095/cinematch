import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Film, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../services/api'
import { useUserStore } from '../store/userStore'
import { RatingStars } from '../components/RatingStars'
import type { Movie } from '../types'

export function Onboarding() {
  const [selections, setSelections] = useState<Record<number, number>>({})
  const [step, setStep] = useState<'select' | 'rate'>('select')
  const [saving, setSaving] = useState(false)
  const { user, setLocalRating, setOnboardingComplete } = useUserStore()
  const navigate = useNavigate()

  const { data: movies, isLoading } = useQuery({
    queryKey: ['onboarding-movies'],
    queryFn: () => api.getOnboardingMovies(),
  })

  const toggleSelect = (movie: Movie) => {
    setSelections((s) => {
      const copy = { ...s }
      if (copy[movie.id] !== undefined) {
        delete copy[movie.id]
      } else {
        copy[movie.id] = 3
      }
      return copy
    })
  }

  const setRating = (movieId: number, rating: number) => {
    setSelections((s) => ({ ...s, [movieId]: rating }))
  }

  const handleFinish = async () => {
    setSaving(true)

    // Save ratings locally immediately so UI is responsive
    Object.entries(selections).forEach(([mid, rating]) => {
      setLocalRating(Number(mid), rating)
    })

    // Fire-and-forget API calls — never block navigation on errors
    if (user) {
      const entries = Object.entries(selections)
      Promise.all(
        entries.map(([mid, rating]) =>
          api.rateMovie(user.id, Number(mid), rating).catch(() => null)
        )
      ).catch(() => null)
    }

    setOnboardingComplete()
    navigate('/')
  }

  const handleSkip = () => {
    setOnboardingComplete()
    navigate('/')
  }

  const selectedCount = Object.keys(selections).length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="text-brand-400 animate-spin" />
        <p className="text-dark-400 text-sm">Chargement des films...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 px-4 py-12">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Film size={28} className="text-brand-400" />
            <span className="text-2xl font-bold text-white">
              Cine<span className="text-brand-400">Match</span>
            </span>
          </div>

          {step === 'select' ? (
            <>
              <h1 className="text-3xl font-bold text-white">Quels films as-tu déjà vus ?</h1>
              <p className="text-dark-400 mt-2 text-sm">
                Sélectionne au moins 3 films pour calibrer tes recommandations.
              </p>
              <div className="mt-4 h-2 bg-dark-800 rounded-full max-w-xs mx-auto overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((selectedCount / 15) * 100, 100)}%` }}
                />
              </div>
              <p className="text-dark-500 text-sm mt-1.5">
                {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''} · min. 3
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-white">Note tes films</h1>
              <p className="text-dark-400 mt-2 text-sm">
                Ces notes vont affiner tes recommandations.
              </p>
              <p className="text-dark-600 text-xs mt-1">
                {selectedCount} film{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
              </p>
            </>
          )}
        </div>

        {/* Step: Select */}
        {step === 'select' && (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-8">
              {(movies ?? []).map((movie) => {
                const selected = selections[movie.id] !== undefined
                return (
                  <button
                    key={movie.id}
                    type="button"
                    onClick={() => toggleSelect(movie)}
                    className="group text-left focus:outline-none"
                  >
                    <div
                      className={clsx(
                        'relative overflow-hidden rounded-xl aspect-[2/3] border-2 transition-all duration-200',
                        selected
                          ? 'border-brand-400 ring-2 ring-brand-400/30'
                          : 'border-transparent hover:border-dark-500'
                      )}
                    >
                      <img
                        src={api.posterUrl(movie.poster_path)}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                      />
                      {selected && (
                        <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
                          <CheckCircle size={32} className="text-brand-400 drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-dark-300 line-clamp-2 leading-tight">
                      {movie.title}
                    </p>
                    <p className="text-[10px] text-dark-600">{movie.year}</p>
                  </button>
                )
              })}
            </div>

            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={handleSkip}
                className="px-6 py-2.5 rounded-xl border border-dark-700 text-dark-500 hover:text-dark-300 hover:border-dark-600 transition-colors text-sm"
              >
                Passer cette étape
              </button>
              <button
                type="button"
                disabled={selectedCount < 3}
                onClick={() => setStep('rate')}
                className="px-8 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold transition-colors"
              >
                Continuer ({selectedCount} sélectionné{selectedCount > 1 ? 's' : ''})
              </button>
            </div>
          </>
        )}

        {/* Step: Rate */}
        {step === 'rate' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {Object.keys(selections).map((mid) => {
                const movieId = Number(mid)
                const movie = (movies ?? []).find((m) => m.id === movieId)
                if (!movie) return null
                const currentRating = selections[movieId] ?? 3
                return (
                  <div
                    key={mid}
                    className="flex gap-4 bg-dark-800 rounded-xl p-4 border border-dark-700"
                  >
                    <img
                      src={api.posterUrl(movie.poster_path, 'w185')}
                      alt={movie.title}
                      className="w-16 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex flex-col justify-between min-w-0">
                      <div>
                        <h3 className="text-sm font-semibold text-white line-clamp-2">
                          {movie.title}
                        </h3>
                        <p className="text-xs text-dark-500 mt-0.5">{movie.year}</p>
                      </div>
                      <RatingStars
                        value={currentRating}
                        onChange={(r) => setRating(movie.id, r)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="px-6 py-2.5 rounded-xl border border-dark-700 text-dark-500 hover:text-dark-300 hover:border-dark-600 transition-colors text-sm"
              >
                Retour
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleFinish}
                className="px-8 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-black font-semibold transition-colors flex items-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Voir mes recommandations
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
