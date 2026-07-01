import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Hls from 'hls.js'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Maximize,
  Minimize,
  Pause,
  Play,
  Settings2,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  ArrowLeft,
} from 'lucide-react'
import FavoriteButton from './FavoriteButton'
import { useTvStore } from '../store/tvStore'
import useOnlineStatus from '../hooks/useOnlineStatus'

const normalizeStreamUrl = (url = '') => {
  return url.replace(/&amp;/g, '&')
}

// On HTTPS pages, wrap HTTP stream URLs through a same-origin proxy to
// avoid Mixed Content blocking. The custom loader rewrites all hls.js
// requests (playlist + segments) to go through /api/proxy, and restores
// the original URL in responses so hls.js resolves relative paths correctly.
const PROXY_PREFIX = '/.netlify/functions/proxy?url='

function createProxyLoader(BaseLoader) {
  function ProxyLoader(config) {
    this._loader = new BaseLoader(config)
  }
  ProxyLoader.prototype.load = function (context, config, callbacks) {
    const originalUrl = context.url
    if (
      originalUrl &&
      originalUrl.startsWith('http://') &&
      window.location.protocol === 'https:'
    ) {
      context.url = PROXY_PREFIX + encodeURIComponent(originalUrl)
    }
    const originalOnSuccess = callbacks.onSuccess
    callbacks.onSuccess = function (response, stats, ctx, networkDetails) {
      response.url = originalUrl
      originalOnSuccess.call(this, response, stats, ctx, networkDetails)
    }
    this._loader.load(context, config, callbacks)
  }
  ProxyLoader.prototype.abort = function () {
    this._loader.abort()
  }
  ProxyLoader.prototype.destroy = function () {
    this._loader.destroy()
  }
  return ProxyLoader
}

const buildQualityOptions = (levels = []) => {
  const byHeight = new Map()
  levels.forEach((level, index) => {
    if (!level?.height) return
    const current = byHeight.get(level.height)
    if (!current || level.bitrate > current.bitrate) {
      byHeight.set(level.height, {
        height: level.height,
        bitrate: level.bitrate || 0,
        levelIndex: index,
      })
    }
  })
  return Array.from(byHeight.values()).sort((a, b) => a.height - b.height)
}

const findLevelIndexByHeight = (levels, height) => {
  const matches = levels
    .map((level, index) => ({ ...level, levelIndex: index }))
    .filter((level) => level.height === height)
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
  return matches[0]?.levelIndex ?? -1
}

// Optimized HLS config for low-latency live streams
const HLS_CONFIG = {
  // Live stream settings
  liveDurationInfinity: true,
  lowLatencyMode: true,
  liveBackBufferLength: 30,
  backBufferLength: 30,

  // Faster initial load
  maxBufferLength: 30,
  maxMaxBufferLength: 60,
  maxBufferSize: 30 * 1000 * 1000, // 30 MB
  maxBufferHole: 0.5,

  // Worker & performance
  enableWorker: true,

  // Aggressive but stable reconnect
  manifestLoadingMaxRetry: 6,
  manifestLoadingRetryDelay: 500,
  manifestLoadingMaxRetryTimeout: 8000,
  fragLoadingMaxRetry: 6,
  fragLoadingRetryDelay: 500,
  fragLoadingMaxRetryTimeout: 8000,
  levelLoadingMaxRetry: 6,
  levelLoadingRetryDelay: 500,
  levelLoadingMaxRetryTimeout: 8000,

  // Stall recovery
  nudgeMaxRetry: 5,
  nudgeOffset: 0.3,
  maxStarvationDelay: 4,
  maxLoadingDelay: 4,

  // Start from live edge for lowest latency
  startPosition: -1,
}

// Extra buffer for mobile / slow connections — reduces re-buffering
const PREBUFFER_OVERRIDES = {
  liveBackBufferLength: 120,
  backBufferLength: 120,
  maxBufferLength: 120,
  maxMaxBufferLength: 180,
  maxBufferSize: 100 * 1000 * 1000, // 100 MB
  maxBufferHole: 1.0,
  maxStarvationDelay: 12,
  maxLoadingDelay: 12,
  fragLoadingMaxRetry: 10,
  fragLoadingMaxRetryTimeout: 15000,
  levelLoadingMaxRetry: 10,
  levelLoadingMaxRetryTimeout: 15000,
  manifestLoadingMaxRetryTimeout: 15000,
  lowLatencyMode: false,
  liveSyncDurationCount: 5,
  startFragPrefetch: true,
  highBufferWatchdogPeriod: 3,
  maxFragLookUpTolerance: 1.2,
  nudgeMaxRetry: 10,
  nudgeOffset: 0.5,
}

export default function VideoPlayer({ channel, onNext, onPrevious, onBack }) {
  const isOnline = useOnlineStatus()
  const videoRef = useRef(null)
  const shellRef = useRef(null)
  const hlsRef = useRef(null)
  const reconnectRef = useRef(0)
  const hideTimerRef = useRef(null)
  const stallTimerRef = useRef(null)
  const mountedRef = useRef(true)
  const settings = useTvStore((state) => state.settings)
  const updateSettings = useTvStore((state) => state.updateSettings)
  const selectedQualityRef = useRef(settings.streamQuality || 'auto')

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(settings.muted)
  const [volume, setVolume] = useState(settings.volume)
  const [isLoading, setIsLoading] = useState(true)
  const [isBuffering, setIsBuffering] = useState(false)
  const [error, setError] = useState('')
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [qualityOptions, setQualityOptions] = useState([])
  const [selectedQuality, setSelectedQuality] = useState(settings.streamQuality || 'auto')
  const [activeQuality, setActiveQuality] = useState('auto')
  const [networkError, setNetworkError] = useState(false)

  const streamUrl = useMemo(() => normalizeStreamUrl(channel?.url), [channel?.url])

  const showControls = useCallback(() => {
    setControlsVisible(true)
    window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(() => setControlsVisible(false), 3000)
  }, [])

  const play = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    try {
      await video.play()
      if (mountedRef.current) {
        setIsPlaying(true)
        setError('')
        setNetworkError(false)
      }
    } catch (playError) {
      if (!mountedRef.current) return
      setIsPlaying(false)
      if (playError?.name !== 'AbortError') {
        setError('Playback was blocked. Press play to start the live stream.')
      }
    }
  }, [])

  const reconnect = useCallback(() => {
    if (!streamUrl) return
    reconnectRef.current = 0
    setError('')
    setNetworkError(false)
    setIsLoading(true)
    setIsBuffering(false)
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    setReloadKey((key) => key + 1)
  }, [streamUrl])

  // Main HLS effect
  useEffect(() => {
    const video = videoRef.current
    if (!video || !streamUrl) return undefined

    mountedRef.current = true
    reconnectRef.current = 0
    setError('')
    setNetworkError(false)
    setIsLoading(true)
    setIsBuffering(false)
    setIsPlaying(false)
    setQualityOptions([])
    setActiveQuality('auto')

    const getBufferEnd = () => {
      const v = videoRef.current
      if (!v) return -1
      const buffered = v.buffered
      if (buffered.length === 0) return -1
      return buffered.end(buffered.length - 1)
    }

    // Stall watchdog: if video is "playing" but currentTime stops advancing, nudge HLS
    // On mobile/prebuffer mode, be more patient — slow connections need more time
    let lastTime = -1
    let stallCount = 0
    const stallThreshold = settings.prebuffer ? 8 : 3
    const stallInterval = settings.prebuffer ? 3000 : 2000
    function startStallWatchdog() {
      window.clearInterval(stallTimerRef.current)
      stallTimerRef.current = window.setInterval(() => {
        const v = videoRef.current
        if (!v || v.paused || v.ended) return
        if (v.currentTime === lastTime) {
          stallCount++
          if (stallCount >= stallThreshold && hlsRef.current) {
            const bufferEnd = getBufferEnd()
            const bufferAhead = bufferEnd - v.currentTime
            if (bufferAhead > 0) {
              v.currentTime = v.currentTime + 0.1
            } else {
              hlsRef.current.startLoad()
            }
          }
        } else {
          stallCount = 0
        }
        lastTime = v.currentTime
      }, stallInterval)
    }

    const onWaiting = () => {
      if (mountedRef.current) setIsBuffering(true)
    }
    const onStalled = () => {
      if (mountedRef.current) setIsBuffering(true)
    }
    const onPlaying = () => {
      if (!mountedRef.current) return
      setIsLoading(false)
      setIsBuffering(false)
      setIsPlaying(true)
      setError('')
      startStallWatchdog()
    }
    const onPause = () => {
      if (mountedRef.current) setIsPlaying(false)
    }
    const onCanPlay = () => {
      if (!mountedRef.current) return
      setIsLoading(false)
      if (settings.autoplay) {
        if (settings.prebuffer) {
          const waitForBufferThenPlay = () => {
            const v = videoRef.current
            if (!v || !mountedRef.current) return
            const bufferEnd = getBufferEnd()
            if (bufferEnd - v.currentTime >= 5) {
              play()
              return
            }
            setIsBuffering(true)
            window.setTimeout(waitForBufferThenPlay, 500)
          }
          waitForBufferThenPlay()
        } else {
          play()
        }
      }
    }
    const onTimeUpdate = () => {
      if (!mountedRef.current) return
      const v = videoRef.current
      if (!v || v.paused) return
      const bufferEnd = getBufferEnd()
      if (bufferEnd - v.currentTime >= 2) {
        setIsBuffering(false)
      }
    }
    const onError = () => {
      if (!mountedRef.current) return
      setError('This stream is temporarily unavailable.')
      setIsLoading(false)
      setIsBuffering(false)
    }

    video.addEventListener('waiting', onWaiting)
    video.addEventListener('stalled', onStalled)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('pause', onPause)
    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('error', onError)

    if (Hls.isSupported()) {
      const effectiveConfig = settings.prebuffer
        ? { ...HLS_CONFIG, ...PREBUFFER_OVERRIDES }
        : HLS_CONFIG
      if (window.location.protocol === 'https:') {
        effectiveConfig.loader = createProxyLoader(Hls.DefaultConfig.loader)
      }
      const hls = new Hls(effectiveConfig)
      hlsRef.current = hls

      hls.loadSource(streamUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!mountedRef.current) return
        const options = buildQualityOptions(hls.levels)
        setQualityOptions(options)

        const preferredQuality = selectedQualityRef.current
        if (preferredQuality === 'auto') {
          hls.currentLevel = -1
        } else {
          const targetHeight = Number(preferredQuality)
          const levelIndex = findLevelIndexByHeight(hls.levels, targetHeight)
          if (levelIndex >= 0) {
            hls.currentLevel = levelIndex
          } else {
            selectedQualityRef.current = 'auto'
            setSelectedQuality('auto')
            updateSettings({ streamQuality: 'auto' })
            hls.currentLevel = -1
          }
        }

        setIsLoading(false)
        if (settings.autoplay) play()
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        if (!mountedRef.current) return
        const height = hls.levels[data.level]?.height
        setActiveQuality(height ? String(height) : 'auto')
      })

      // Fragment buffered — stream is actively loading
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (mountedRef.current) setIsBuffering(false)
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!mountedRef.current) return

        if (!data?.fatal) {
          // Non-fatal: log and skip
          return
        }

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setNetworkError(true)
          const maxRetries = settings.prebuffer ? 10 : 5
          const maxDelay = settings.prebuffer ? 16000 : 8000
          if (reconnectRef.current < maxRetries) {
            reconnectRef.current++
            setIsBuffering(true)
            const delay = Math.min(500 * 2 ** (reconnectRef.current - 1), maxDelay)
            window.setTimeout(() => {
              if (hlsRef.current) hlsRef.current.startLoad()
            }, delay)
            return
          }
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && reconnectRef.current < 3) {
          reconnectRef.current++
          hls.recoverMediaError()
          return
        }

        setError('Live stream connection failed. Try reconnecting.')
        setIsLoading(false)
        setIsBuffering(false)
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = streamUrl
      video.load()
    } else {
      setError('This browser cannot play HLS live streams.')
      setIsLoading(false)
    }

    return () => {
      mountedRef.current = false
      window.clearTimeout(hideTimerRef.current)
      window.clearInterval(stallTimerRef.current)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('stalled', onStalled)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('error', onError)
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      setQualityOptions([])
      video.removeAttribute('src')
      video.load()
    }
  }, [streamUrl, settings.autoplay, settings.prebuffer, play, reloadKey, updateSettings])

  // Sync volume/mute to video element and persist
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = isMuted
    video.volume = volume
    updateSettings({ muted: isMuted, volume })
  }, [isMuted, volume, updateSettings])

  // Fullscreen state sync
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(() => setControlsVisible(false), 3000)
    const onKeyDown = (event) => {
      const tagName = document.activeElement?.tagName?.toLowerCase()
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        onPrevious?.()
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        onNext?.()
      }
      if (event.key === ' ') {
        event.preventDefault()
        isPlaying ? videoRef.current?.pause() : play()
      }
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        toggleFullscreen()
      }
      showControls()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isPlaying, onNext, onPrevious, play, showControls])

  const togglePlay = () => {
    showControls()
    if (isPlaying) {
      videoRef.current?.pause()
    } else {
      play()
    }
  }

  function toggleFullscreen() {
    const shell = shellRef.current
    if (!shell) return
    if (document.fullscreenElement) {
      document.exitFullscreen?.()
    } else {
      shell.requestFullscreen?.()
    }
  }

  const onVolumeChange = (event) => {
    const nextVolume = Number(event.target.value)
    setVolume(nextVolume)
    setIsMuted(nextVolume === 0)
    showControls()
  }

  const onQualityChange = (event) => {
    const nextQuality = event.target.value
    const hls = hlsRef.current

    selectedQualityRef.current = nextQuality
    setSelectedQuality(nextQuality)
    updateSettings({ streamQuality: nextQuality })

    if (hls) {
      if (nextQuality === 'auto') {
        hls.currentLevel = -1
      } else {
        const levelIndex = findLevelIndexByHeight(hls.levels, Number(nextQuality))
        hls.currentLevel = levelIndex >= 0 ? levelIndex : -1
      }
    }

    showControls()
  }

  const visibleQualityOptions = qualityOptions.filter((quality) =>
    [240, 360, 480, 720, 1080].includes(quality.height),
  )
  const qualityChoices = visibleQualityOptions.length > 1 ? visibleQualityOptions : qualityOptions

  const showSpinner = isLoading || (!settings.prebuffer && isBuffering)
  const bufferingLabel = isLoading ? 'Loading live stream…' : networkError ? 'Reconnecting…' : 'Buffering…'

  return (
    <section
      ref={shellRef}
      onMouseMove={showControls}
      onFocus={showControls}
      className="relative min-h-screen overflow-hidden bg-black"
    >
      {/* ── Offline overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            key="offline-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/90 px-6 text-center"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
              <WifiOff className="h-12 w-12 text-white/50" />
            </div>
            <div>
              <p className="text-2xl font-black text-white sm:text-3xl">No Internet Connection</p>
              <p className="mt-2 max-w-sm text-base text-white/50">
                Connect to the internet to watch live streams. The app will resume automatically.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <video
        ref={videoRef}
        playsInline
        autoPlay={settings.autoplay}
        muted={isMuted}
        className="h-screen w-full bg-black object-contain"
      />

      {showSpinner && !error && (
        <div className="absolute inset-0 grid place-items-center bg-black/35">
          <div className="flex flex-col items-center gap-4">
            {/* Buffering spinner */}
            <div className="relative h-16 w-16 tv:h-24 tv:w-24">
              <svg className="absolute inset-0 h-full w-full animate-spin" viewBox="0 0 48 48" fill="none">
                <circle
                  cx="24" cy="24" r="20"
                  stroke="rgb(255 255 255 / 0.12)"
                  strokeWidth="4"
                />
                <circle
                  cx="24" cy="24" r="20"
                  stroke="rgb(103 232 249)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="62.83"
                  strokeDashoffset="47"
                />
              </svg>
              {networkError
                ? <Wifi className="absolute inset-0 m-auto h-6 w-6 text-cyan-300 tv:h-9 tv:w-9" />
                : <Play className="absolute inset-0 m-auto h-6 w-6 fill-cyan-300 text-cyan-300 tv:h-9 tv:w-9" />
              }
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-white tv:text-2xl">{bufferingLabel}</p>
              {networkError && (
                <p className="mt-1 text-sm text-white/55 tv:text-lg">Checking connection…</p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/60 px-4">
          <div className="max-w-xl rounded-card border border-red-300/30 bg-red-950/35 p-6 text-center shadow-2xl backdrop-blur-2xl tv:max-w-3xl tv:p-10">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-300 tv:h-20 tv:w-20" />
            <p className="mt-4 text-xl font-black tv:text-4xl">{error}</p>
            <button
              type="button"
              onClick={reconnect}
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/70 tv:min-h-16 tv:px-8 tv:text-2xl"
            >
              <RotateCcw className="h-5 w-5 tv:h-8 tv:w-8" />
              Reconnect
            </button>
          </div>
        </div>
      )}

      {onBack && (
        <motion.div
          animate={{ opacity: controlsVisible ? 1 : 0, y: controlsVisible ? 0 : -18 }}
          transition={{ duration: 0.2 }}
          className="absolute left-4 top-4 z-30 tv:left-8 tv:top-8"
        >
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 font-bold text-white backdrop-blur-2xl transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-cyan-300/70 tv:h-20 tv:px-8 tv:text-3xl"
          >
            <ArrowLeft className="h-5 w-5 tv:h-9 tv:w-9" />
            <span className="hidden sm:inline">Back</span>
          </button>
        </motion.div>
      )}

      <motion.div
        animate={{ opacity: controlsVisible ? 1 : 0, y: controlsVisible ? 0 : 18 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-x-0 bottom-0 z-20 p-4 sm:p-6 tv:p-10"
      >
        <div className="rounded-card border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur-2xl tv:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <img
                src={channel.logo}
                alt={`${channel.name} logo`}
                className="h-14 w-14 rounded-2xl border border-white/10 bg-white/10 object-contain p-2 tv:h-24 tv:w-24"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-100 tv:text-base">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                  Live
                </div>
                <h1 className="truncate text-xl font-black sm:text-3xl tv:text-5xl">{channel.name}</h1>
                <p className="mt-1 text-sm font-semibold uppercase tracking-[0.18em] text-white/50 tv:text-xl">{channel.category}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button type="button" aria-label="Previous channel" onClick={onPrevious} className="player-button">
                <SkipBack />
              </button>
              <button type="button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} className="player-button primary">
                {isPlaying ? <Pause /> : <Play className="fill-current" />}
              </button>
              <button type="button" aria-label="Next channel" onClick={onNext} className="player-button">
                <SkipForward />
              </button>
              <button type="button" aria-label={isMuted ? 'Unmute' : 'Mute'} onClick={() => setIsMuted((value) => !value)} className="player-button">
                {isMuted || volume === 0 ? <VolumeX /> : volume > 0.55 ? <Volume2 /> : <Volume1 />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={onVolumeChange}
                className="h-12 w-28 accent-cyan-300 tv:w-48"
                aria-label="Volume"
              />
              {qualityChoices.length > 1 && (
                <label className="quality-select-wrap">
                  <Settings2 className="h-4 w-4 text-cyan-200 tv:h-7 tv:w-7" />
                  <span className="sr-only">HLS quality</span>
                  <select
                    value={selectedQuality}
                    onChange={onQualityChange}
                    onFocus={showControls}
                    aria-label={`Quality selector. Current stream quality ${selectedQuality === 'auto' ? `Auto${activeQuality !== 'auto' ? `, ${activeQuality}p active` : ''}` : `${selectedQuality}p`}`}
                    className="quality-select"
                  >
                    <option value="auto">Auto{activeQuality !== 'auto' ? ` (${activeQuality}p)` : ''}</option>
                    {qualityChoices.map((quality) => (
                      <option key={quality.height} value={quality.height}>
                        {quality.height}p
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <FavoriteButton channel={channel} />
              <button type="button" aria-label="Fullscreen" onClick={toggleFullscreen} className="player-button">
                {isFullscreen ? <Minimize /> : <Maximize />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
