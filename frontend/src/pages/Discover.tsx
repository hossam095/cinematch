import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Search, X, Film, Tv, LayoutGrid, Loader2, UserRound, Sparkles } from 'lucide-react'
import { api } from '../services/api'
import { MovieCard } from '../components/MovieCard'
import { Chip } from '../components/Chip'
import { useSearchStore } from '../store/searchStore'
import { FILTER_KEYS, LANGUAGE_LABELS, describeSearch, toApiParams } from '../lib/searchLabel'

const PAGE_SIZE = 60

const SORT_OPTIONS = [
  { value: 'popularity', label: 'Popularité' },
  { value: 'rating', label: 'Mieux notés' },
  { value: 'year', label: 'Plus récents' },
  { value: 'year_asc', label: 'Plus anciens' },
  { value: 'title', label: 'Titre A → Z' },
]

const MEDIA_TYPES = [
  { value: '', label: 'Tout', icon: <LayoutGrid size={15} /> },
  { value: 'movie', label: 'Films', icon: <Film size={15} /> },
  { value: 'tv', label: 'Séries', icon: <Tv size={15} /> },
]

function useDebounced(value: string, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function FilterGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <p className="text-sm font-semibold text-dark-200">{title}</p>
        {hint && <p className="text-xs text-dark-500">{hint}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

export function Discover() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: facets } = useQuery({ queryKey: ['facets'], queryFn: api.getFacets, staleTime: Infinity })
  const addSearch = useSearchStore((s) => s.addSearch)

  // Text inputs are local state, debounced into the URL
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [actorInput, setActorInput] = useState(searchParams.get('actor') ?? '')
  const debouncedSearch = useDebounced(searchInput)
  const debouncedActor = useDebounced(actorInput)

  // Current filter state (all from the URL so it is shareable and combinable)
  const filters = useMemo(() => {
    const f: Record<string, string> = {}
    for (const k of FILTER_KEYS) {
      const v = searchParams.get(k)
      if (v) f[k] = v
    }
    return f
  }, [searchParams])
  const sort = searchParams.get('sort') ?? 'popularity'
  const type = filters.type ?? ''
  const genres = filters.genre ? filters.genre.split(',') : []

  const setParams = (updates: Record<string, string>) => {
    const p = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(updates)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    setSearchParams(p, { replace: true })
  }
  const toggle = (key: string, value: string) => setParams({ [key]: filters[key] === value ? '' : value })
  const toggleGenre = (g: string) => {
    const next = genres.includes(g) ? genres.filter((x) => x !== g) : [...genres, g]
    setParams({ genre: next.join(',') })
  }
  const clearAll = () => {
    setSearchInput('')
    setActorInput('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  useEffect(() => {
    setParams({ search: debouncedSearch.trim(), actor: debouncedActor.trim() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, debouncedActor])

  const apiParams = { ...toApiParams(filters), sort, limit: String(PAGE_SIZE) }

  const { data, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['discover', apiParams],
      queryFn: ({ pageParam }) => api.getMoviesPaged({ ...apiParams, offset: String(pageParam) }),
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) => {
        const loaded = pages.reduce((n, p) => n + p.items.length, 0)
        return loaded < lastPage.total && lastPage.items.length > 0 ? loaded : undefined
      },
      staleTime: 30 * 1000,
    })

  const movies = data?.pages.flatMap((p) => p.items) ?? []
  const total = data?.pages[0]?.total ?? 0
  const hasFilters = Object.keys(filters).length > 0
  const label = describeSearch(filters, facets)

  // Remember the search once it has produced results, so the home page can build on it
  useEffect(() => {
    if (hasFilters && data && total > 0 && label) {
      addSearch({ params: filters, label })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.pages[0], label])

  const durations = useMemo(() => {
    const all = facets?.durations ?? []
    if (type === 'tv') return all.filter((d) => d.key.startsWith('episode_'))
    if (type === 'movie') return all.filter((d) => !d.key.startsWith('episode_'))
    return all
  }, [facets, type])

  const countLabel = type === 'movie' ? 'film' : type === 'tv' ? 'série' : 'titre'
  const plural = total > 1 ? 's' : ''
  const found = type === 'tv' ? 'trouvée' : 'trouvé'

  return (
    <div className="min-h-screen bg-dark-950 pt-20 pb-16 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Trouver quoi regarder</h1>
          <p className="text-dark-400 mt-1">
            Combine autant de critères que tu veux : le catalogue s'affine en direct.
          </p>
        </div>

        {/* Text search + actor */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3 mb-6">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="Titre, réalisateur, acteur..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-10 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white"
                aria-label="Effacer la recherche"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="relative">
            <UserRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="Avec un acteur précis..."
              value={actorInput}
              onChange={(e) => setActorInput(e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-10 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition"
            />
            {actorInput && (
              <button
                onClick={() => setActorInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white"
                aria-label="Effacer l'acteur"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Filter groups */}
        <div className="bg-dark-900/60 border border-dark-800 rounded-2xl p-5 sm:p-6 mb-6 space-y-5">
          <FilterGroup title="Type">
            {MEDIA_TYPES.map((t) => (
              <Chip key={t.value} active={type === t.value} onClick={() => setParams({ type: t.value, duration: '' })} size="md">
                {t.icon}
                {t.label}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup title="Avec qui ?">
            {(facets?.audiences ?? []).map((a) => (
              <Chip key={a.key} active={filters.audience === a.key} onClick={() => toggle('audience', a.key)} size="md">
                <span>{a.emoji}</span>
                {a.label}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup title="Thème" hint="plusieurs possibles">
            {(facets?.themes ?? []).map((t) => (
              <Chip key={t.key} active={genres.includes(t.key)} onClick={() => toggleGenre(t.key)}>
                <span>{t.emoji}</span>
                {t.label}
              </Chip>
            ))}
          </FilterGroup>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <FilterGroup title="Saison de l'année">
              {(facets?.seasons ?? []).map((s) => (
                <Chip key={s.key} active={filters.season === s.key} onClick={() => toggle('season', s.key)}>
                  <span>{s.emoji}</span>
                  {s.label}
                  {s.key === facets?.current_season && (
                    <span className="text-[10px] opacity-70">(en ce moment)</span>
                  )}
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup title="Durée" hint={type === 'tv' ? 'par épisode' : undefined}>
              {durations.map((d) => (
                <Chip key={d.key} active={filters.duration === d.key} onClick={() => toggle('duration', d.key)}>
                  {d.label}
                </Chip>
              ))}
            </FilterGroup>
          </div>

          <FilterGroup title="Époque">
            {(facets?.eras ?? []).map((e) => (
              <Chip key={e.key} active={filters.era === e.key} onClick={() => toggle('era', e.key)}>
                {e.label}
              </Chip>
            ))}
          </FilterGroup>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <p className="text-sm font-semibold text-dark-200 mb-2">Langue</p>
              <select
                value={filters.language ?? ''}
                onChange={(e) => setParams({ language: e.target.value })}
                className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="">Toutes</option>
                {Object.entries(LANGUAGE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-sm font-semibold text-dark-200 mb-2">Trier par</p>
              <select
                value={sort}
                onChange={(e) => setParams({ sort: e.target.value })}
                className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Active filters summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <p className="text-sm text-dark-400">
            {isLoading ? (
              'Recherche en cours...'
            ) : (
              <>
                <span className="text-white font-semibold">{total.toLocaleString('fr-FR')}</span>{' '}
                {countLabel}{plural} {found}{plural}
                {label && <span className="text-dark-500"> · {label}</span>}
                {isFetching && !isFetchingNextPage && (
                  <Loader2 size={14} className="inline ml-2 animate-spin text-brand-400" />
                )}
              </>
            )}
          </p>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-sm text-dark-400 hover:text-white"
            >
              <X size={14} />
              Tout effacer
            </button>
          )}
        </div>

        {/* Results */}
        {!isLoading && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
            {movies.length === 0 && (
              <div className="text-center py-20">
                <Sparkles size={28} className="mx-auto text-dark-600 mb-3" />
                <p className="text-dark-400 text-lg">Aucun résultat avec ces critères</p>
                <p className="text-dark-600 text-sm mt-1">Retire un filtre ou deux pour élargir la recherche</p>
              </div>
            )}
            {hasNextPage && (
              <div className="flex flex-col items-center mt-10 gap-2">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white hover:border-brand-500 disabled:opacity-60 transition-colors text-sm font-medium"
                >
                  {isFetchingNextPage && <Loader2 size={16} className="animate-spin" />}
                  Afficher plus
                </button>
                <p className="text-xs text-dark-600">
                  {movies.length} / {total.toLocaleString('fr-FR')}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
