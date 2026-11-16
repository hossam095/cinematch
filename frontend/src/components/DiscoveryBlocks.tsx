import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { History, X, Film, Tv } from 'lucide-react'
import { api } from '../services/api'
import { MovieSection } from './MovieSection'
import { useSearchStore, searchKey, type RecentSearch } from '../store/searchStore'
import { toApiParams } from '../lib/searchLabel'

const discoverUrl = (params: Record<string, string>) =>
  '/discover?' + new URLSearchParams(params).toString()

/** Films + series that fit the current season of the year. */
export function SeasonalSections() {
  const { data } = useQuery({
    queryKey: ['seasonal'],
    queryFn: () => api.getSeasonal(undefined, 15),
    staleTime: 60 * 60 * 1000,
  })
  if (!data) return null
  const { season } = data
  const when: Record<string, string> = {
    winter: 'cet hiver', spring: 'ce printemps', summer: 'cet été', autumn: 'cet automne',
  }
  return (
    <>
      <MovieSection
        title={`${season.emoji} Films pour ${when[season.key] ?? season.label}`}
        subtitle={season.tagline}
        movies={data.movies}
        link={discoverUrl({ type: 'movie', season: season.key })}
        icon={<Film size={20} className="text-brand-400" />}
      />
      <MovieSection
        title={`${season.emoji} Séries de saison`}
        subtitle={season.tagline}
        movies={data.series}
        link={discoverUrl({ type: 'tv', season: season.key })}
        icon={<Tv size={20} className="text-brand-400" />}
      />
    </>
  )
}

function RecentSearchSection({ search }: { search: RecentSearch }) {
  const removeSearch = useSearchStore((s) => s.removeSearch)
  const apiParams = { ...toApiParams(search.params), limit: '15' }
  const { data } = useQuery({
    queryKey: ['recent-search', apiParams],
    queryFn: () => api.getMovies(apiParams),
    staleTime: 10 * 60 * 1000,
  })
  if (!data || data.length === 0) return null
  return (
    <MovieSection
      title={search.label}
      subtitle="D'après tes dernières recherches"
      movies={data}
      link={discoverUrl(search.params)}
      icon={<History size={20} className="text-brand-400" />}
      action={
        <button
          onClick={() => removeSearch(searchKey(search.params))}
          className="p-2 rounded-full bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
          aria-label="Oublier cette recherche"
          title="Oublier cette recherche"
        >
          <X size={14} />
        </button>
      }
    />
  )
}

/** One carousel per remembered search (most recent first). */
export function RecentSearchSections({ max = 3 }: { max?: number }) {
  const recent = useSearchStore((s) => s.recent)
  return (
    <>
      {recent.slice(0, max).map((s) => (
        <RecentSearchSection key={searchKey(s.params)} search={s} />
      ))}
    </>
  )
}

const THEME_TILES: Record<string, string> = {
  Horror: 'bg-[#2a1530]',
  Comedy: 'bg-[#2e2410]',
  'Sci-Fi': 'bg-[#0f2a3a]',
  Romance: 'bg-[#2a1c1c]',
  Adventure: 'bg-[#1c2a1c]',
  Mystery: 'bg-[#1a1f3a]',
}

/** "Avec qui ?" cards + theme tiles, linking straight into the Trouver page. */
export function BrowseBlocks() {
  const { data: facets } = useQuery({ queryKey: ['facets'], queryFn: api.getFacets, staleTime: Infinity })
  if (!facets) return null
  const tiles = facets.themes.filter((t) => t.key in THEME_TILES)
  const rest = facets.themes.filter((t) => !(t.key in THEME_TILES))
  return (
    <section className="mb-12 px-4 sm:px-8">
      <h2 className="text-xl sm:text-2xl font-bold text-dark-50">Avec qui regardes-tu ce soir ?</h2>
      <p className="text-sm text-dark-400 mb-4">Une sélection adaptée à la soirée</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        {facets.audiences.map((a) => (
          <Link
            key={a.key}
            to={discoverUrl({ audience: a.key })}
            className="group bg-dark-800 border border-dark-600 hover:border-brand-500 rounded-card p-5 transition-colors"
          >
            <div className="text-3xl mb-2">{a.emoji}</div>
            <p className="font-display text-lg text-dark-50 font-semibold group-hover:text-brand-400 transition-colors">{a.label}</p>
            <p className="text-xs text-dark-400 mt-1 line-clamp-2">{a.description}</p>
          </Link>
        ))}
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-dark-50">Choisis ton ambiance</h2>
      <p className="text-sm text-dark-400 mb-4">Un thème, puis affine avec la durée, l'époque ou un acteur</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
        {tiles.map((t) => (
          <Link
            key={t.key}
            to={discoverUrl({ genre: t.key })}
            className={`flex flex-col justify-between min-h-[110px] p-4 rounded-card text-dark-50 font-semibold hover:ring-2 hover:ring-brand-500/60 transition ${THEME_TILES[t.key]}`}
          >
            <span className="text-2xl">{t.emoji}</span>
            {t.label}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {rest.map((t) => (
          <Link
            key={t.key}
            to={discoverUrl({ genre: t.key })}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-full bg-dark-800 border border-dark-600 text-dark-200 hover:text-white hover:border-brand-500 transition-colors"
          >
            <span>{t.emoji}</span>
            {t.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
