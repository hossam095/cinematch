import { Link, useLocation } from 'react-router-dom'
import { Home, Compass, User, Film } from 'lucide-react'
import clsx from 'clsx'
import { useUserStore } from '../store/userStore'

export function Navigation() {
  const location = useLocation()
  const { user } = useUserStore()

  const links = [
    { to: '/', icon: <Home size={20} />, label: 'Accueil' },
    { to: '/discover', icon: <Compass size={20} />, label: 'Découvrir' },
    { to: user ? `/profile` : '/login', icon: <User size={20} />, label: user ? user.username : 'Connexion' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-950/95 backdrop-blur border-b border-dark-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Film size={24} className="text-brand-400" />
          <span className="text-white">Cine<span className="text-brand-400">Match</span></span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                location.pathname === link.to
                  ? 'bg-dark-700 text-brand-400'
                  : 'text-dark-300 hover:text-white hover:bg-dark-800'
              )}
            >
              {link.icon}
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
