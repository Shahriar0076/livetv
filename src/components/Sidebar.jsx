import { NavLink } from 'react-router-dom'
import { Heart, Home, Search, Settings, Tv } from 'lucide-react'

const items = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/favorites', label: 'Saved', icon: Heart },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="fixed bottom-0 left-0 top-0 z-50 hidden w-24 border-r border-white/[0.07] bg-[#07080f]/85 backdrop-blur-2xl lg:block xl:w-28">
      <div className="flex h-full flex-col items-center gap-5 py-5">
        {/* Brand icon */}
        <NavLink
          to="/"
          data-focusable="true"
          aria-label="Live TV home"
          className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-xl shadow-violet-500/30 transition hover:shadow-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-400/60 tv:h-16 tv:w-16"
        >
          <Tv className="h-6 w-6 tv:h-9 tv:w-9" />
        </NavLink>

        {/* Divider */}
        <div className="h-px w-10 bg-white/[0.08]" />

        {/* Nav items */}
        <nav className="flex flex-1 flex-col items-center justify-center gap-3">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                data-focusable="true"
                aria-label={item.label}
                className={({ isActive }) => [
                  'group relative flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-[10px] font-bold uppercase tracking-widest transition focus:outline-none focus:ring-2 focus:ring-violet-400/60 w-14 xl:w-16 tv:w-20 tv:py-4',
                  isActive
                    ? 'border-violet-400/40 bg-gradient-to-b from-violet-500/20 to-fuchsia-500/10 text-violet-200 shadow-lg shadow-violet-500/10'
                    : 'border-white/[0.07] bg-white/[0.04] text-white/50 hover:bg-white/[0.09] hover:text-white/80',
                ].join(' ')}
              >
                <Icon className="h-5 w-5 tv:h-7 tv:w-7" />
                <span>{item.label}</span>
                {/* Active dot */}
                <span className="absolute -right-px top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-violet-400 opacity-0 transition group-[.border-violet-400\/40]:opacity-100" />
              </NavLink>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
