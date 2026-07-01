import { motion } from 'framer-motion'

export default function ChannelSkeleton({ index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.18) }}
      className="animate-pulse overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 backdrop-blur-xl sm:min-h-44"
    >
      <div className="flex h-full flex-col">
        {/* Status badge placeholder */}
        <div className="flex items-start justify-between">
          <div className="h-5 w-14 rounded-full bg-white/[0.06]" />
          <div className="h-5 w-5 rounded-full bg-white/[0.06]" />
        </div>

        {/* Logo placeholder */}
        <div className="flex flex-1 items-center justify-center py-4">
          <div className="h-16 w-16 rounded-2xl bg-white/[0.04] sm:h-20 sm:w-20" />
        </div>

        {/* Name + category placeholders */}
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded-md bg-white/[0.06]" />
          <div className="h-3 w-1/2 rounded-md bg-white/[0.04]" />
        </div>
      </div>
    </motion.div>
  )
}
