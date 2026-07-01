import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { EyeOff, Play, Radio, X } from 'lucide-react'
import FavoriteButton from './FavoriteButton'
import { useTvStore } from '../store/tvStore'

function ChannelCard({ channel, index = 0, featured = false, onRemove }) {
  const [imageFailed, setImageFailed] = useState(false)
  const adultEnabled = useTvStore((state) => state.settings.adultContentEnabled)
  const liveStatus = useTvStore((state) => state.liveStatus[channel.id])

  const isBlocked = channel.isAdult && !adultEnabled

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.18) }}
      whileHover={isBlocked ? {} : { y: -4, scale: 1.012 }}
      className="group relative"
    >
      <Link
        to={isBlocked ? '#' : `/live/${channel.id}`}
        onClick={isBlocked ? (e) => e.preventDefault() : undefined}
        data-focusable={!isBlocked ? 'true' : undefined}
        title={isBlocked ? 'Enable 18+ content in Settings to watch' : channel.name}
        className={[
          'relative block overflow-hidden rounded-2xl border bg-white/[0.06] shadow-xl shadow-black/20 backdrop-blur-xl transition',
          isBlocked
            ? 'cursor-not-allowed border-white/[0.06] opacity-70'
            : 'border-white/[0.08] hover:border-violet-400/40 hover:bg-white/[0.10]',
          'focus:outline-none focus:ring-2 focus:ring-violet-400/60',
          featured ? 'min-h-[20rem] p-4 sm:p-5' : 'min-h-40 p-3 sm:min-h-44',
        ].join(' ')}
      >
        {/* Hover glow */}
        {!isBlocked && (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
        )}

        <div className="relative z-10 flex h-full flex-col">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            {liveStatus === 'dead' ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.07] px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-widest text-white/40 tv:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                Offline
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-400/25 bg-red-500/15 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-widest text-red-300 tv:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,1)]" />
                Live
              </span>
            )}
            {channel.isAdult && (
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/30 bg-orange-500/15 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-widest text-orange-300">
                18+
              </span>
            )}
            {onRemove ? (
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onRemove(channel.id)
                  }}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/15 bg-black/35 text-white/50 backdrop-blur-xl transition hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-300"
                  aria-label="Remove from recently watched"
                >
                  <X className="h-3 w-3" />
                </button>
                <FavoriteButton channel={channel} tiny />
              </div>
            ) : (
              <FavoriteButton channel={channel} compact />
            )}
          </div>

          {/* Logo */}
          <div className="flex flex-1 items-center justify-center py-4">
            {isBlocked ? (
              <div className={[
                'grid place-items-center rounded-2xl border border-white/[0.07] bg-black/30',
                featured ? 'h-28 w-28 sm:h-36 sm:w-36' : 'h-16 w-16 sm:h-20 sm:w-20',
              ].join(' ')}>
                <EyeOff className="h-7 w-7 text-white/25" />
              </div>
            ) : (
              <div className={[
                'grid place-items-center rounded-2xl border border-white/[0.07] bg-black/20 shadow-inner',
                featured ? 'h-28 w-28 sm:h-36 sm:w-36 tv:h-44 tv:w-44' : 'h-16 w-16 sm:h-20 sm:w-20 tv:h-28 tv:w-28',
              ].join(' ')}>
                {imageFailed || !channel.logo ? (
                  <Radio className="h-8 w-8 text-white/30 tv:h-10 tv:w-10" />
                ) : (
                  <img
                    src={channel.logo}
                    alt={`${channel.name} logo`}
                    loading="lazy"
                    decoding="async"
                    onError={() => setImageFailed(true)}
                    className="max-h-full max-w-full object-contain drop-shadow-lg"
                  />
                )}
              </div>
            )}
          </div>

          {/* Name + category */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className={[
                'truncate font-bold leading-tight',
                featured ? 'text-xl sm:text-2xl tv:text-3xl' : 'text-sm tv:text-lg',
              ].join(' ')}>
                {isBlocked ? '••••••••' : channel.name}
              </p>
              {!isBlocked && (
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-500 text-white opacity-0 shadow-lg shadow-violet-500/40 transition group-hover:opacity-100 tv:h-9 tv:w-9">
                  <Play className="h-3 w-3 fill-current tv:h-4 tv:w-4" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-widest text-white/40 tv:text-xs">
              <span className="truncate">{isBlocked ? 'Adult Content' : channel.category}</span>
              {channel.number && !isBlocked && <span className="shrink-0 text-white/25">#{channel.number}</span>}
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  )
}

export default memo(ChannelCard)
