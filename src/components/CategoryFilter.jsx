import { NavLink } from 'react-router-dom'
import { allCategories, channelsByCategory } from '../lib/allChannels'
import { useTvStore } from '../store/tvStore'

export default function CategoryFilter({ compact = false, channels }) {
  const adultEnabled = useTvStore((state) => state.settings.adultContentEnabled)

  // If a custom channel list is passed, derive unique categories from it.
  // Otherwise use the pre-built allCategories list (no runtime computation).
  const categories = channels
    ? Array.from(new Set(channels.map((ch) => ch.category).filter(Boolean))).sort()
    : allCategories

  // Filter out XXX category if adult content is disabled
  const visibleCategories = adultEnabled
    ? categories
    : categories.filter((c) => {
        const list = channelsByCategory.get(c)
        return list?.some((ch) => !ch.isAdult)
      })

  const pillClass = (isActive) =>
    [
      'shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-violet-400/60 tv:px-5 tv:py-2.5 tv:text-base',
      compact ? '' : 'px-4 py-1.5',
      isActive
        ? 'border-violet-400/50 bg-violet-500/20 text-violet-200 shadow-md shadow-violet-500/10'
        : 'border-white/[0.07] bg-white/[0.05] text-white/55 hover:bg-white/[0.10] hover:text-white/90',
    ].join(' ')

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto py-0.5">
      <NavLink
        to="/"
        end
        data-focusable="true"
        className={({ isActive }) => pillClass(isActive)}
      >
        All
      </NavLink>
      {visibleCategories.map((cat) => (
        <NavLink
          key={cat}
          to={`/category/${encodeURIComponent(cat)}`}
          data-focusable="true"
          className={({ isActive }) => pillClass(isActive)}
        >
          {cat}
        </NavLink>
      ))}
    </div>
  )
}
