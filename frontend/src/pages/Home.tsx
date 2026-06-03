import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Sparkles, TrendingUp, Users, Clock, Moon, Film, ArrowRight } from 'lucide-react'
import { api } from '../services/api'
import { useUserStore } from '../store/userStore'
import { MovieSection } from '../components/MovieSection'
import type { Movie, RecoSection } from '../types'

function Hero() {
  const { user } = useUserStore()
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-dark-900 via-dark-900 to-dark-800 border-b border-dark-700">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #ffc107 0%, transparent 50%), radial-gradient(circle at 80% 20%, #ff8f00 0%, transparent 40%)',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
            Vos prochains films<br />
            <span className="text-brand-400">vous attendent.</span>
          </h1>
          <p className="text-dark-300 mt-4 text-lg">
            Des recommandations personnalisées basées sur vos goûts, la communauté, et le contexte.
          </p>
          {!user && (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 mt-6 bg-brand-500 hover:bg-brand-600 text-black font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <Film size={18} />
              Créer mon profil
              <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function GuestHome() {
  const { data: movies } = useQuery({
    queryKey: ['movies-popular'],
    queryFn: () => api.getMovies({ sort: 'popularity', limit: '30' }),
  })
  const { data: topRated } = useQuery({
    queryKey: ['movies-rated'],
    queryFn: () => api.getMovies({ sort: 'rating', limit: '20' }),
  })

  return (
    <>
      <Hero />
      <div className="max-w-7xl mx-auto pt-10">
        <MovieSection
          title="Films tendance"
          subtitle="Les plus populaires en ce moment"
          movies={movies ?? []}
          icon={<TrendingUp size={20} className="text-brand-400" />}
        />
        <MovieSection
          title="Les mieux notés"
          subtitle="Note TMDB > 8.0"
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
  const { user } = useUserStore()

  const { data: sections, isLoading } = useQuery<RecoSection>({
    queryKey: ['sections', userId],
    queryFn: () => api.getRecommendationSections(userId),
    staleTime: 5 * 60 * 1000,
  })

  const { data: recos } = useQuery<Movie[]>({
    queryKey: ['recommendations', userId],
    queryFn: () => api.getRecommendations(userId),
    staleTime: 5 * 60 * 1000,
  })

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
            subtitle="Les plus populaires en ce moment"
            movies={sections.trending}
            icon={<TrendingUp size={20} className="text-brand-400" />}
          />
        )}
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
