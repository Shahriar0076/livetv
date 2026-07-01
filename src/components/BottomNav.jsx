import { NavLink } from 'react-router-dom'
import { Heart, Home, Search, Settings } from 'lucide-react'

const items = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/favorites', label: 'Saved', icon: Heart },
  { to: '/settings', label: 'More', icon: Settings },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.07] bg-[#07080f]/90 px-2 pb-safe pt-1 backdrop-blur-2xl lg:hidden">
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => [
                'flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-bold uppercase tracking-widest transition focus:outline-none focus:ring-2 focus:ring-violet-400/60',
                isActive
                  ? 'bg-gradient-to-b from-violet-500/20 to-fuchsia-500/10 text-violet-300'
                  : 'text-white/45 hover:bg-white/[0.07] hover:text-white/75',
              ].join(' ')}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
