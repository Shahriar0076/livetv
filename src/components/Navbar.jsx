import { Link, useLocation } from 'react-router-dom'
import { MonitorPlay, Search, Settings } from 'lucide-react'
import allChannels from '../lib/allChannels'

const totalChannels = allChannels.length

export default function Navbar() {
  const location = useLocation()

  const breadcrumb =
    location.pathname === '/'
      ? 'Home'
      : decodeURIComponent(location.pathname.split('/').filter(Boolean).join(' › '))

  return (
    <header className="fixed left-0 right-0 top-0 z-40 lg:left-24 xl:left-28">
      <div className="mx-auto flex h-14 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#06070d]/80 px-4 backdrop-blur-2xl sm:px-6 lg:h-16 lg:px-8">
        {/* Logo */}
        <Link
          to="/"
          data-focusable="true"
          className="flex shrink-0 items-center gap-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/60"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-violet-500/30 tv:h-12 tv:w-12">
            <MonitorPlay className="h-5 w-5 text-white tv:h-7 tv:w-7" />
          </span>
          <span className="hidden sm:block">
            <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-pink-300 bg-clip-text text-[15px] font-black leading-none tracking-wide text-transparent tv:text-2xl">
              Live TV
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-white/40 tv:text-xs">
              {totalChannels} channels live
            </span>
          </span>
        </Link>

        {/* Breadcrumb pill */}
        <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">
          <div className="max-w-xs truncate rounded-full border border-white/[0.08] bg-white/[0.05] px-4 py-1.5 text-xs font-semibold text-white/45 tv:text-sm">
            {breadcrumb}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Link
            to="/search"
            data-focusable="true"
            aria-label="Search"
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.06] text-white/65 transition hover:bg-white/[0.12] hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-400/60 tv:h-12 tv:w-12"
          >
            <Search className="h-4 w-4 tv:h-6 tv:w-6" />
          </Link>

          <Link
            to="/settings"
            data-focusable="true"
            aria-label="Settings"
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.06] text-white/65 transition hover:bg-white/[0.12] hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-400/60 tv:h-12 tv:w-12"
          >
            <Settings className="h-4 w-4 tv:h-6 tv:w-6" />
          </Link>
        </div>
      </div>
    </header>
  )
}
