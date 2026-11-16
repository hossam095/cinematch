import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, TrendingUp, Users, Clock, Moon, Film, ArrowRight, Tv, Heart, Headphones, PartyPopper } from 'lucide-react'
import { api } from '../services/api'
import { useUserStore } from '../store/userStore'
import { MovieSection } from '../components/MovieSection'
import { SeasonalSections, RecentSearchSections, BrowseBlocks } from '../components/DiscoveryBlocks'
import type { Movie, RecoSection } from '../types'

function Hero() {
  const { user } = useUserStore()
  const { data: facets } = useQuery({ queryKey: ['facets'], queryFn: api.getFacets, staleTime: Infinity })
  const { data: seasonal } = useQuery({
    queryKey: ['seasonal'],
    queryFn: () => api.getSeasonal(undefined, 15),
    staleTime: 60 * 60 * 1000,
  })
  // Three well-known films for the poster collage
  const { data: collage } = useQuery({
    queryKey: ['hero-collage'],
    queryFn: () =>
      api.getMovies({ media_type: 'movie', sort: 'popularity', rating_min: '7.8', year_max: '2025', limit: '3' }),
    staleTime: 60 * 60 * 1000,
  })
  const season = seasonal?.season
  const audienceIcon: Record<string, React.ReactNode> = {
    family: <Users size={16} className="text-brand-400" />,
    couple: <Heart size={16} className="text-brand-400" />,
    solo: <Headphones size={16} className="text-brand-400" />,
    friends: <PartyPopper size={16} className="text-brand-400" />,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 sm:pt-14 pb-6">
      <div className="flex flex-wrap items-center gap-10">
        {/* Copy + quick audience picks */}
        <div className="flex-1 min-w-[280px] basis-[460px] flex flex-col gap-5">
          {season && (
            <span className="self-start inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-dark-800 border border-dark-600 text-mint-400 text-sm font-semibold">
              <Clock size={14} />
              {season.label} · {season.tagline.split(':')[0]}
            </span>
          )}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1] tracking-tighter text-dark-50">
            Trouve quoi regarder{' '}
            <span className="text-brand-500">en 30 secondes.</span>
          </h1>
          <p className="text-dark-300 text-lg leading-relaxed max-w-lg">
            7 000 films et séries. Choisis avec qui, combien de temps, quelle ambiance : on filtre, tu profites.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {(facets?.audiences ?? []).map((a) => (
              <Link
                key={a.key}
                to={`/discover?audience=${a.key}`}
                className="inline-flex items-center gap-2.5 px-4 py-3 rounded-[14px] bg-dark-800 border border-dark-600 hover:border-brand-500 text-dark-50 text-sm font-medium transition-colors"
              >
                {audienceIcon[a.key]}
                {a.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-1">
            <Link
              to="/discover"
              className="inline-flex items-center gap-2.5 bg-brand-500 hover:bg-brand-400 text-dark-950 font-bold px-6 py-3.5 rounded-[14px] transition-colors"
            >
              Tous les filtres
              <ArrowRight size={18} />
            </Link>
            {!user && (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 border border-dark-600 hover:border-brand-500 text-dark-50 font-semibold px-6 py-3.5 rounded-[14px] transition-colors"
              >
                <Film size={18} />
                Créer mon profil
              </Link>
            )}
          </div>
        </div>

        {/* Poster collage */}
        {collage && collage.length === 3 && (
          <div className="hidden md:grid flex-1 min-w-[320px] basis-[420px] grid-cols-3 gap-3.5 items-end">
            <Link to={`/movie/${collage[0].id}`} className="block -rotate-[4deg]">
              <img src={api.posterUrl(collage[0].poster_path, 'w342')} alt={collage[0].title} className="w-full aspect-[2/3] object-cover rounded-card" />
            </Link>
            <Link to={`/movie/${collage[1].id}`} className="block mb-9 shadow-glow rounded-card">
              <img src={api.posterUrl(collage[1].poster_path, 'w342')} alt={collage[1].title} className="w-full aspect-[2/3] object-cover rounded-card" />
            </Link>
            <Link to={`/movie/${collage[2].id}`} className="block rotate-[4deg]">
              <img src={api.posterUrl(collage[2].poster_path, 'w342')} alt={collage[2].title} className="w-full aspect-[2/3] object-cover rounded-card" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function GuestHome() {
  const { data: movies } = useQuery({
    queryKey: ['movies-popular'],
    queryFn: () => api.getMovies({ media_type: 'movie', sort: 'popularity', limit: '30' }),
  })
  const { data: series } = useQuery({
    queryKey: ['series-popular'],
    queryFn: () => api.getMovies({ media_type: 'tv', sort: 'popularity', limit: '30' }),
  })
  const { data: topRated } = useQuery({
    queryKey: ['movies-rated'],
    queryFn: () => api.getMovies({ media_type: 'movie', sort: 'rating', limit: '20' }),
  })

  return (
    <>
      <Hero />
      <div className="max-w-7xl mx-auto pt-10">
        <RecentSearchSections />
        <SeasonalSections />
        <BrowseBlocks />
        <MovieSection
          title="Films tendance"
          subtitle="Les plus populaires en ce moment"
          movies={movies ?? []}
          icon={<TrendingUp size={20} className="text-brand-400" />}
        />
        <MovieSection
          title="Séries tendance"
          subtitle="Les séries les plus regardées"
          movies={series ?? []}
          icon={<Tv size={20} className="text-brand-400" />}
        />
        <MovieSection
          title="Les mieux notés"
          subtitle="Meilleures notes TMDB"
          movies={topRated ?? []}
          icon={<Sparkles size={20} className="text-brand-400" />}
        />
      </div>
    </>
  )
}

function PersonalisedHome({ userId }: { userId: number }) {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  // All hooks MUST be called before any conditional return
  const { user, logout } = useUserStore()
  const navigate = useNavigate()

  const { data: sections, isLoading, isError: sectionsError } = useQuery<RecoSection>({
    queryKey: ['sections', userId],
    queryFn: () => api.getRecommendationSections(userId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const { data: recos } = useQuery<Movie[]>({
    queryKey: ['recommendations', userId],
    queryFn: () => api.getRecommendations(userId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  // Si l'utilisateur n'existe plus en base (404 après redémarrage du backend),
  // on déconnecte et on redirige vers la page de connexion
  useEffect(() => {
    if (sectionsError) {
      logout()
      navigate('/login')
    }
  }, [sectionsError, logout, navigate])

  const becauseLiked = sections?.because_you_liked
  const becauseLikedMovies: Movie[] =
    becauseLiked && !Array.isArray(becauseLiked)
      ? (becauseLiked.movies ?? [])
      : Array.isArray(becauseLiked)
      ? becauseLiked
      : []
  const becauseLikedRef =
    becauseLiked && !Array.isArray(becauseLiked) ? becauseLiked.reference : ''

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <Sparkles size={32} className="text-brand-400 mx-auto mb-3 animate-pulse" />
          <p className="text-dark-400">Calcul de vos recommandations...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-dark-900 border-b border-dark-800 px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white">
            {greeting},{' '}
            <span className="text-brand-400">{user?.username}</span> 👋
          </h1>
          <p className="text-dark-400 mt-1">Voici ce que nous avons préparé pour vous.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8">
        {/* Built from the user's own recent searches */}
        <RecentSearchSections />

        {/* Season of the year */}
        <SeasonalSections />

        {/* Tonight */}
        {sections?.tonight && sections.tonight.length > 0 && (
          <MovieSection
            title="Pour toi ce soir"
            subtitle={hour < 18 ? 'Films à découvrir aujourd\'hui' : 'Sélection du soir'}
            movies={sections.tonight}
            icon={<Moon size={20} className="text-brand-400" />}
          />
        )}

        {/* Personalised recommendations */}
        {recos && recos.length > 0 && (
          <MovieSection
            title="Recommandé pour toi"
            subtitle="Combinaison de tes goûts et de la communauté"
            movies={recos}
            showSource
            icon={<Sparkles size={20} className="text-brand-400" />}
          />
        )}

        {/* Because you liked */}
        {becauseLikedMovies.length > 0 && (
          <MovieSection
            title={`Parce que tu as aimé "${becauseLikedRef}"`}
            subtitle="Films au contenu similaire"
            movies={becauseLikedMovies}
            icon={<Film size={20} className="text-brand-400" />}
          />
        )}

        {/* Collaborative */}
        {sections?.collaborative && sections.collaborative.length > 0 && (
          <MovieSection
            title="La communauté a aimé"
            subtitle="Utilisateurs aux goûts similaires"
            movies={sections.collaborative}
            icon={<Users size={20} className="text-brand-400" />}
          />
        )}

        {/* Short films */}
        {sections?.short_films && sections.short_films.length > 0 && (
          <MovieSection
            title="Films courts (< 100 min)"
            subtitle="Parfait quand le temps manque"
            movies={sections.short_films}
            icon={<Clock size={20} className="text-brand-400" />}
          />
        )}

        {/* Trending */}
        {sections?.trending && sections.trending.length > 0 && (
          <MovieSection
            title="Tendances"
            subtitle="Les films les plus populaires en ce moment"
            movies={sections.trending}
            icon={<TrendingUp size={20} className="text-brand-400" />}
          />
        )}

        {/* Trending series */}
        {sections?.trending_series && sections.trending_series.length > 0 && (
          <MovieSection
            title="Séries tendance"
            subtitle="Les séries les plus regardées"
            movies={sections.trending_series}
            icon={<Tv size={20} className="text-brand-400" />}
          />
        )}

        <BrowseBlocks />
      </div>
    </>
  )
}

export function Home() {
  const { user } = useUserStore()
  return (
    <div className="bg-dark-950 min-h-screen pb-16">
      {user ? <PersonalisedHome userId={user.id} /> : <GuestHome />}
    </div>
  )
}
