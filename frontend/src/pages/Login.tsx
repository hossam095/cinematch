import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Film, User } from 'lucide-react'
import { api } from '../services/api'
import { useUserStore } from '../store/userStore'

export function Login() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setUser, hasCompletedOnboarding } = useUserStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = username.trim()
    if (!name) return
    setLoading(true)
    setError('')
    try {
      const user = await api.createUser(name)
      setUser(user)
      if (user.rating_count === 0 && !hasCompletedOnboarding) {
        navigate('/onboarding')
      } else {
        navigate('/')
      }
    } catch {
      setError('Erreur de connexion. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Film size={40} className="text-brand-400" />
          </div>
          <h1 className="text-4xl font-bold text-white">
            Cine<span className="text-brand-400">Match</span>
          </h1>
          <p className="text-dark-400 mt-3 text-lg">Vos films, vos goûts.</p>
        </div>

        <div className="bg-dark-800 rounded-2xl p-8 border border-dark-700">
          <h2 className="text-xl font-semibold text-white mb-6">Créer ou rejoindre un profil</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="text"
                placeholder="Votre pseudo..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={30}
                className="w-full bg-dark-700 border border-dark-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-dark-950 font-semibold rounded-xl py-3 transition-colors"
            >
              {loading ? 'Connexion...' : 'Commencer'}
            </button>
          </form>

          <p className="text-dark-500 text-sm text-center mt-4">
            Entrez le même pseudo pour retrouver votre profil.
          </p>
        </div>
      </div>
    </div>
  )
}
