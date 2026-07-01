import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Grid3X3, Search } from 'lucide-react'
import { channelsByCategory } from '../lib/allChannels'
import { useTvStore } from '../store/tvStore'
import ChannelGrid from '../components/ChannelGrid'
import CategoryFilter from '../components/CategoryFilter'
import Seo from '../components/Seo'

export default function Category() {
  const { name = '' } = useParams()
  const category = decodeURIComponent(name)
  const adultEnabled = useTvStore((state) => state.settings.adultContentEnabled)
  const liveStatus = useTvStore((state) => state.liveStatus)
  const liveCheckVersion = useTvStore((state) => state.liveCheckVersion)

  // O(1) map lookup → pre-sorted A-Z list; filter adult + live
  const channels = useMemo(() => {
    const list = channelsByCategory.get(category) ?? []
    const filtered = adultEnabled ? list : list.filter((ch) => !ch.isAdult)
    return filtered.filter((ch) => liveStatus[ch.id] === 'live')
  }, [category, adultEnabled, liveStatus, liveCheckVersion])

  return (
    <div className="space-y-6 tv:space-y-10">
      <Seo
        title={`${category} Channels`}
        description={`Watch ${channels.length} ${category} live IPTV channels on Live TV.`}
      />
      <header className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-widest text-violet-300">
              <Grid3X3 className="h-3 w-3" />
              Category
            </div>
            <h1 className="text-3xl font-black sm:text-5xl tv:text-7xl">{category}</h1>
            <p className="mt-2 text-white/55 tv:text-2xl">{channels.length} live channels</p>
          </div>
          <Link to="/search" className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.06] px-4 text-sm font-bold text-white/70 transition hover:bg-white/[0.10] focus:outline-none focus:ring-2 focus:ring-violet-400/60">
            <Search className="h-4 w-4" />
            Search
          </Link>
        </div>
        <CategoryFilter active={category} />
      </header>

      <ChannelGrid
        channels={channels}
        emptyTitle="Category not found"
        emptyText="Choose another category from the filter bar."
      />
    </div>
  )
}
