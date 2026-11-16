import { Link, useLocation } from 'react-router-dom'
import { Home, Compass, User, Play } from 'lucide-react'
import clsx from 'clsx'
import { useUserStore } from '../store/userStore'

export function Navigation() {
  const location = useLocation()
  const { user } = useUserStore()

  const links = [
    { to: '/', icon: <Home size={18} />, label: 'Accueil' },
    { to: '/discover', icon: <Compass size={18} />, label: 'Trouver' },
    { to: user ? `/profile` : '/login', icon: <User size={18} />, label: user ? user.username : 'Connexion' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-950/90 backdrop-blur border-b border-dark-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-xl tracking-tight text-dark-50">
          <span className="inline-flex w-8 h-8 rounded-[10px] bg-brand-500 items-center justify-center">
            <Play size={15} className="text-dark-950 fill-dark-950 ml-0.5" />
          </span>
          CineMatch
        </Link>

        <div className="flex items-center gap-1 bg-dark-800 p-1 rounded-full">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={clsx(
                'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-colors',
                location.pathname === link.to
                  ? 'bg-brand-500 text-dark-950 font-semibold'
                  : 'text-dark-200 hover:text-white'
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
