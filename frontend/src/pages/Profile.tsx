import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { User, Star, LogOut, Film, TrendingUp, Clock } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../services/api'
import { useUserStore } from '../store/userStore'
import { RatingStars } from '../components/RatingStars'

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 flex items-center gap-3">
      <div className="text-brand-400">{icon}</div>
      <div>
        <div className="text-xl font-bold text-white">{value}</div>
        <div className="text-xs text-dark-500">{label}</div>
      </div>
    </div>
  )
}

export function Profile() {
  const { user, logout, localRatings } = useUserStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'ratings' | 'recs'>('ratings')

  const { data: ratings } = useQuery({
    queryKey: ['user-ratings', user?.id],
    queryFn: () => api.getUserRatings(user!.id),
    enabled: !!user,
  })

  const { data: recs } = useQuery({
    queryKey: ['recommendations', user?.id],
    queryFn: () => api.getRecommendations(user!.id),
    enabled: !!user && activeTab === 'recs',
  })

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-950 pt-24 flex flex-col items-center justify-center gap-4 px-4">
        <User size={48} className="text-dark-600" />
        <p className="text-dark-400 text-lg">Vous n'êtes pas connecté.</p>
        <Link
          to="/login"
          className="bg-brand-500 hover:bg-brand-600 text-black font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Se connecter
        </Link>
      </div>
    )
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const avgRating =
    ratings && ratings.length > 0
      ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
      : '–'

  // Genre distribution from ratings
  const genreDist: Record<string, number> = {}
  ratings?.forEach((r) => {
    // We don't have genres in RatingOut; skip genre stats for now
  })

  return (
    <div className="min-h-screen bg-dark-950 pt-20 pb-16 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-500/20 border-2 border-brand-500 flex items-center justify-center">
              <span className="text-2xl font-bold text-brand-400">
                {user.username[0].toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{user.username}</h1>
              <p className="text-dark-500 text-sm">Membre CineMatch</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-dark-400 hover:text-red-400 transition-colors text-sm"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <StatCard icon={<Film size={20} />} label="Films notés" value={ratings?.length ?? 0} />
          <StatCard icon={<Star size={20} />} label="Note moyenne" value={avgRating} />
          <StatCard icon={<TrendingUp size={20} />} label="Recommandations actives" value={recs?.length ?? '–'} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-dark-800 p-1 rounded-xl mb-6 w-fit">
          {(['ratings', 'recs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-5 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'bg-brand-500 text-black'
                  : 'text-dark-400 hover:text-white'
              )}
            >
              {tab === 'ratings' ? 'Mes notes' : 'Recommandations'}
            </button>
          ))}
        </div>

        {activeTab === 'ratings' && (
          <div>
            {!ratings || ratings.length === 0 ? (
              <div className="text-center py-16">
                <Star size={32} className="text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400">Vous n'avez noté aucun film.</p>
                <Link to="/discover" className="text-brand-400 hover:text-brand-300 text-sm mt-2 inline-block">
                  Découvrir des films →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {[...ratings]
                  .sort((a, b) => b.rating - a.rating)
                  .map((r) => (
                    <Link
                      key={r.movie_id}
                      to={`/movie/${r.movie_id}`}
                      className="flex items-center justify-between bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl px-5 py-4 transition-colors"
                    >
                      <span className="text-white font-medium">{r.movie_title ?? `Film #${r.movie_id}`}</span>
                      <RatingStars value={localRatings[r.movie_id] ?? r.rating} readonly size="sm" />
                    </Link>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'recs' && (
          <div>
            {!recs || recs.length === 0 ? (
              <div className="text-center py-16">
                <Clock size={32} className="text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400">Notez des films pour obtenir des recommandations.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                {recs.map((m) => (
                  <Link key={m.id} to={`/movie/${m.id}`} className="group">
                    <div className="relative overflow-hidden rounded-xl aspect-[2/3] bg-dark-800">
                      <img
                        src={api.posterUrl(m.poster_path)}
                        alt={m.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <p className="text-white text-xs font-semibold line-clamp-1">{m.title}</p>
                        <p className="text-dark-400 text-[10px]">{m.year}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
