import { useMemo, useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import allChannels from '../lib/allChannels'
import { useTvStore } from '../store/tvStore'
import ChannelGrid from '../components/ChannelGrid'
import SearchBar from '../components/SearchBar'
import CategoryFilter from '../components/CategoryFilter'
import Seo from '../components/Seo'

// Pre-filter adult channels outside component — stable reference, never re-created
const safeChannels = allChannels.filter((ch) => !ch.isAdult)
const allWithAdult = allChannels

export default function Search() {
  const [query, setQuery] = useState('')
  const adultEnabled = useTvStore((state) => state.settings.adultContentEnabled)
  const liveStatus = useTvStore((state) => state.liveStatus)
  const liveCheckVersion = useTvStore((state) => state.liveCheckVersion)

  const channels = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    // Use pre-built _search string — no template-literal work per channel per keystroke
    const pool = adultEnabled ? allWithAdult : safeChannels
    return pool.filter((ch) => ch._search.includes(term) && liveStatus[ch.id] === 'live')
  }, [query, adultEnabled, liveStatus, liveCheckVersion])

  return (
    <div className="space-y-6 tv:space-y-10">
      <Seo
        title="Search Live TV"
        description="Search live IPTV channels by channel name or category on Live TV."
      />
      <header>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-widest text-violet-300">
          <SearchIcon className="h-3 w-3" />
          Search
        </div>
        <h1 className="text-3xl font-black sm:text-5xl tv:text-7xl">Find Live TV</h1>
        <p className="mt-2 text-white/55 tv:text-2xl">Search by channel name or category.</p>
      </header>

      <SearchBar value={query} onChange={setQuery} autoFocus />
      {!query && <CategoryFilter />}

      {query ? (
        <ChannelGrid
          channels={channels}
          emptyTitle="No results"
          emptyText="Try a channel name, country, or category."
        />
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-6 py-12 text-center">
          <p className="text-base font-bold text-white tv:text-2xl">Start typing to search</p>
          <p className="mt-1 text-xs text-white/40 tv:text-base">Results appear instantly as you type.</p>
        </div>
      )}
    </div>
  )
}
