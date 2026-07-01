import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, Home } from 'lucide-react'
import allChannels, { channelIndex } from '../lib/allChannels'
import VideoPlayer from '../components/VideoPlayer'
import { useTvStore } from '../store/tvStore'
import Seo from '../components/Seo'

// Total channel count — stable, computed once
const TOTAL = allChannels.length

export default function Player() {
  const { id } = useParams()
  const navigate = useNavigate()
  const setCurrentChannel = useTvStore((state) => state.setCurrentChannel)

  // O(1) Map lookup instead of O(n) findIndex + array access
  const channel = channelIndex.get(id) ?? null
  const isDead = useTvStore((state) => state.liveStatus[id]) === 'dead'
  const index = useMemo(
    () => (channel ? allChannels.indexOf(channel) : -1),
    [channel],
  )

  useEffect(() => {
    if (channel) setCurrentChannel(channel)
  }, [channel, setCurrentChannel])

  if (!channel) {
    return (
      <>
        <Seo title="Channel Not Found" description="The requested live TV channel is not available in the Live TV catalog." noIndex />
        <div className="grid min-h-screen place-items-center bg-[#06070d] px-6 text-center">
          <div>
            <p className="text-3xl font-black tv:text-6xl">Channel not found</p>
            <p className="mt-3 text-white/55 tv:text-2xl">The live channel you requested is not in the catalog.</p>
            <Link to="/" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 font-bold text-slate-950 focus:outline-none focus:ring-4 focus:ring-cyan-300/70 tv:min-h-20 tv:px-10 tv:text-3xl">
              <Home className="h-5 w-5 tv:h-9 tv:w-9" />
              Go Home
            </Link>
          </div>
        </div>
      </>
    )
  }

  const goNext = () => navigate(`/live/${allChannels[(index + 1) % TOTAL].id}`)
  const goPrevious = () => navigate(`/live/${allChannels[(index - 1 + TOTAL) % TOTAL].id}`)

  return (
    <div className="relative min-h-screen bg-black">
      <Seo
        title={`${channel.name} Live`}
        description={`Watch ${channel.name} live on Live TV. Category: ${channel.category}.`}
        image={channel.logo || '/favicon.svg'}
        type="video.other"
      />
      {isDead && (
        <div className="absolute left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-red-400/25 bg-red-500/15 px-4 py-2 text-xs font-semibold text-red-300 backdrop-blur-xl">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          This channel appears to be offline. The stream may not play.
        </div>
      )}
      <VideoPlayer channel={channel} onNext={goNext} onPrevious={goPrevious} onBack={() => navigate(-1)} />
    </div>
  )
}
