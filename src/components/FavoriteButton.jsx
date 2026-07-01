import { memo } from 'react'
import { Heart } from 'lucide-react'
import { useTvStore } from '../store/tvStore'

function FavoriteButton({ channel, compact = false, tiny = false }) {
  const isFavorite = useTvStore((state) => state.favoriteIds.includes(channel?.id))
  const toggleFavorite = useTvStore((state) => state.toggleFavorite)

  const onClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    toggleFavorite(channel)
  }

  return (
    <button
      type="button"
      data-focusable="true"
      aria-label={isFavorite ? `Remove ${channel?.name} from favorites` : `Add ${channel?.name} to favorites`}
      onClick={onClick}
      className={[
        'group/fav grid shrink-0 place-items-center rounded-full border border-white/15 bg-black/35 text-white shadow-lg backdrop-blur-xl transition',
        'hover:border-rose-300/60 hover:bg-rose-500/20 focus:outline-none focus:ring-4 focus:ring-cyan-300/70',
        tiny ? 'h-6 w-6' : compact ? 'h-10 w-10' : 'h-12 w-12 tv:h-14 tv:w-14',
      ].join(' ')}
    >
      <Heart
        className={[
          tiny ? 'h-3 w-3' : compact ? 'h-4 w-4' : 'h-5 w-5 tv:h-6 tv:w-6',
          isFavorite ? 'fill-rose-500 text-rose-400' : 'text-white/80 group-hover/fav:text-rose-300',
        ].join(' ')}
      />
    </button>
  )
}

export default memo(FavoriteButton)
