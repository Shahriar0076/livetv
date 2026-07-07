import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock3, Heart, Play, RadioTower, Sparkles, Tv2 } from 'lucide-react'
import allChannels, { byIds, allCategories, channelIndex } from '../lib/allChannels'
import { useTvStore } from '../store/tvStore'
import useScrollRestore from '../hooks/useScrollRestore'
import ChannelCard from '../components/ChannelCard'
import ChannelGrid from '../components/ChannelGrid'
import SearchBar from '../components/SearchBar'
import CategoryFilter from '../components/CategoryFilter'
import Seo from '../components/Seo'

// Stable module-level pools — no re-creation on each render
const safeChannels = allChannels.filter((ch) => !ch.isAdult)

function SectionHeader({ icon: Icon, title, action, accent = 'violet' }) {
  const colors = {
    violet: 'text-violet-300 border-violet-400/20 bg-violet-500/10',
    rose: 'text-rose-300 border-rose-400/20 bg-rose-500/10',
    cyan: 'text-cyan-300 border-cyan-400/20 bg-cyan-500/10',
  }
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <span className={`grid h-8 w-8 place-items-center rounded-xl border ${colors[accent]} tv:h-12 tv:w-12`}>
          <Icon className="h-4 w-4 tv:h-6 tv:w-6" />
        </span>
        <h2 className="text-base font-black tracking-tight tv:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  )
}

function StatPill({ label, value, gradient }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-white/[0.07] px-4 py-3 text-center ${gradient}`}>
      <span className="text-2xl font-black leading-none">{value}</span>
      <span className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-widest text-white/50">{label}</span>
    </div>
  )
}

export default function Home() {
  useScrollRestore()
  const [query, setQuery] = useState('')
  const favoriteIds = useTvStore((state) => state.favoriteIds)
  const recentlyWatchedIds = useTvStore((state) => state.recentlyWatchedIds)
  const currentChannelId = useTvStore((state) => state.currentChannelId)
  const adultEnabled = useTvStore((state) => state.settings.adultContentEnabled)
  const liveStatus = useTvStore((state) => state.liveStatus)
  const liveCheckVersion = useTvStore((state) => state.liveCheckVersion)
  const liveCheckProgress = useTvStore((state) => state.liveCheckProgress)
  const removeRecentlyWatched = useTvStore((state) => state.removeRecentlyWatched)

  const visibleChannels = useMemo(
    () => (adultEnabled ? allChannels : safeChannels).filter(
      (ch) => liveStatus[ch.id] === 'live',
    ),
    [adultEnabled, liveStatus, liveCheckVersion],
  )

  // O(1) per ID via channelIndex Map
  const featured = useMemo(
    () => channelIndex.get('codecloudbd-somoy-tv00x') || allChannels[0],
    [currentChannelId],
  )
  const favorites = useMemo(
    () => byIds(favoriteIds).slice(0, 8).filter((ch) => liveStatus[ch.id] === 'live'),
    [favoriteIds, liveStatus, liveCheckVersion],
  )
  const recentlyWatched = useMemo(
    () => byIds(recentlyWatchedIds).slice(0, 8).filter((ch) => liveStatus[ch.id] === 'live'),
    [recentlyWatchedIds, liveStatus, liveCheckVersion],
  )

  // Use pre-built _search string — no template-literal concat per channel per keystroke
  const filteredChannels = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return visibleChannels
    return visibleChannels.filter((ch) => ch._search.includes(term))
  }, [query, visibleChannels])

  const isCheckingEmpty = liveCheckProgress.isRunning && visibleChannels.length === 0

  // allCategories is pre-sorted at module load — no recomputation needed
  const categories = allCategories

  const stats = [
    { label: 'Matches', value: allChannels.length, gradient: 'bg-violet-500/10' },
    { label: 'Live Now', value: visibleChannels.length, gradient: 'bg-fuchsia-500/10' },
    { label: 'Teams', value: categories.length, gradient: 'bg-pink-500/10' },
    { label: 'Favorites', value: favoriteIds.length, gradient: 'bg-rose-500/10' },
  ]

  return (
    <>
      <Seo
        title="FIFA World Cup Live"
        description={`Watch ${allChannels.length} live FIFA World Cup channels — every match, every goal, live and free.`}
      />
      <div className="space-y-6 tv:space-y-10">

        {/* ── Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0d0a1f] via-[#100c20] to-[#0a0d1c] p-1 shadow-2xl shadow-black/40"
        >
          {/* Ambient glows */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
            <div className="absolute -bottom-10 right-10 h-48 w-48 rounded-full bg-fuchsia-600/20 blur-3xl" />
            <div className="absolute top-10 right-1/3 h-32 w-32 rounded-full bg-pink-500/15 blur-2xl" />
          </div>

          <div className="relative grid gap-4 rounded-[1.4rem] p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
            {/* Left content */}
            <div className="flex flex-col gap-4">
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-widest text-violet-300">
                <Sparkles className="h-3 w-3" />
                FIFA World Cup 2026
              </div>
              <div>
                <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl tv:text-7xl">
                  Watch FIFA{' '}
                  <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                    live.
                  </span>
                </h1>
                <p className="mt-2 max-w-xl text-sm font-medium text-white/50 sm:text-base tv:text-2xl">
                  Every match, every goal, every moment — stream all FIFA World Cup matches live and free.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  to={`/live/${featured.id}`}
                  data-focusable="true"
                  className="inline-flex h-11 items-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 text-sm font-black text-white shadow-xl shadow-violet-600/30 transition hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-400/70 tv:h-16 tv:px-8 tv:text-2xl"
                >
                  <Play className="h-4 w-4 fill-current tv:h-6 tv:w-6" />
                  Watch Now
                </Link>
                <Link
                  to="/search"
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.06] px-5 text-sm font-bold text-white/80 transition hover:bg-white/[0.11] focus:outline-none tv:h-16 tv:px-8 tv:text-2xl"
                >
                  <Tv2 className="h-4 w-4" />
                  Browse All
                </Link>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {stats.map((s) => (
                  <StatPill key={s.label} {...s} />
                ))}
              </div>
            </div>

            {/* Featured card */}
            <div className="hidden lg:block lg:w-52 xl:w-60">
              <ChannelCard channel={featured} featured />
            </div>
          </div>
        </motion.section>

        {/* ── Search + Categories ── */}
        <section className="space-y-3">
          <SearchBar value={query} onChange={setQuery} />
          <CategoryFilter compact channels={visibleChannels} />
        </section>

        {query ? (
          /* ── Search Results (shown under search when querying) ── */
          <section>
            <SectionHeader
              icon={RadioTower}
              title={`Results for "${query}"`}
              accent="violet"
            />
            <ChannelGrid
              channels={filteredChannels}
              emptyTitle="No matching channels"
              emptyText="Try a different search or category."
            />
          </section>
        ) : (
          <>
            {/* ── Recently Watched ── */}
            {recentlyWatched.length > 0 && (
              <section>
                <SectionHeader icon={Clock3} title="Recently Watched" accent="cyan" />
                <ChannelGrid channels={recentlyWatched} onRemove={removeRecentlyWatched} />
              </section>
            )}

            {/* ── Favorites ── */}
            {favorites.length > 0 && (
              <section>
                <SectionHeader
                  icon={Heart}
                  title="Favorites"
                  accent="rose"
                  action={
                    <Link to="/favorites" className="text-xs font-bold text-violet-300 hover:text-white transition tv:text-lg">
                      View all
                    </Link>
                  }
                />
                <ChannelGrid channels={favorites} />
              </section>
            )}

            {/* ── All Channels ── */}
            <section>
              <SectionHeader
                icon={RadioTower}
                title="All Live Channels"
                accent="violet"
              />
              <ChannelGrid
                channels={filteredChannels}
                emptyTitle="No matching channels"
                emptyText="Try a different search or category."
                loading={isCheckingEmpty}
              />
            </section>
          </>
        )}
      </div>
    </>
  )
}
