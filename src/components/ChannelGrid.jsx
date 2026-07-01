import ChannelCard from './ChannelCard'
import ChannelSkeleton from './ChannelSkeleton'

const SKELETON_COUNT = 8

export default function ChannelGrid({ channels, emptyTitle = 'No channels found', emptyText = 'Try a different filter.', featured = false, onRemove, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 tv:grid-cols-4 tv:gap-7">
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <ChannelSkeleton key={i} index={i} />
        ))}
      </div>
    )
  }

  if (!channels?.length) {
    return (
      <div className="rounded-card border border-white/10 bg-white/[0.06] px-6 py-14 text-center backdrop-blur-2xl">
        <p className="text-xl font-bold text-white tv:text-3xl">{emptyTitle}</p>
        <p className="mt-2 text-sm text-white/55 tv:text-lg">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 tv:grid-cols-4 tv:gap-7">
      {channels.map((channel, index) => (
        <ChannelCard key={channel.id} channel={channel} index={index} featured={featured} onRemove={onRemove} />
      ))}
    </div>
  )
}
