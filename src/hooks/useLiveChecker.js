import { useEffect, useRef } from 'react'
import { useTvStore } from '../store/tvStore'
import allChannels from '../lib/allChannels'

const CONCURRENCY = 25
const TIMEOUT_MS = 5000
const READ_TIMEOUT_MS = 3000
const STALE_AFTER_MS = 24 * 60 * 60 * 1000

async function readWithTimeout(reader, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reader.cancel()
      reject(new Error('Read timeout'))
    }, ms)
    reader.read().then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) },
    )
  })
}

async function checkChannel(url, signal) {
  try {
    const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS)
    const combined = AbortSignal.any
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      signal: combined,
    })
    if (!response.ok) return false
    const ct = response.headers.get('content-type') || ''
    if (ct.includes('audio') || ct.includes('video')) return true
    if (ct.includes('mpegurl') || ct.includes('x-mpegURL') || ct.includes('vnd.apple.mpegurl')) return true
    const reader = response.body?.getReader()
    if (!reader) return false
    const { value, done } = await readWithTimeout(reader, READ_TIMEOUT_MS)
    reader.cancel()
    if (done || !value) return false
    const head = new TextDecoder().decode(value.slice(0, 512))
    return head.includes('#EXTM3U') || head.includes('#EXTINF')
  } catch {
    return false
  }
}

export default function useLiveChecker() {
  const lastLiveCheckAt = useTvStore((state) => state.lastLiveCheckAt)
  const liveCheckProgress = useTvStore((state) => state.liveCheckProgress)
  const setManyLiveStatus = useTvStore((state) => state.setManyLiveStatus)
  const setLiveCheckProgress = useTvStore((state) => state.setLiveCheckProgress)
  const storeSet = useTvStore.setState

  const runCounter = useRef(0)

  useEffect(() => {
    const currentRun = ++runCounter.current
    const controller = new AbortController()

    const now = Date.now()
    const isStale = !lastLiveCheckAt || (now - lastLiveCheckAt) > STALE_AFTER_MS

    if (!isStale) {
      setLiveCheckProgress(0, 0, false)
      return
    }

    const channels = allChannels.filter((ch) => ch.url && !/\.(mp4|mkv|avi|webm|mov|flv|wmv|m4v|mpg|mpeg)$/i.test(ch.url))
    const total = channels.length
    const liveStatus = {}
    let checked = 0
    let nextIndex = 0
    let lastFlush = 0
    let flushCount = 0
    const BATCH_SIZES = [5, 5, 50]

    setLiveCheckProgress(0, total, true)

    function flush() {
      if (controller.signal.aborted) return
      if (runCounter.current !== currentRun) return
      setManyLiveStatus(liveStatus)
      setLiveCheckProgress(checked, total, checked < total)
    }

    async function worker() {
      while (!controller.signal.aborted && runCounter.current === currentRun) {
        const index = nextIndex++
        if (index >= total) break

        const ch = channels[index]
        if (!ch) break

        const isLive = await checkChannel(ch.url, controller.signal)

        if (controller.signal.aborted) return
        if (runCounter.current !== currentRun) return

        liveStatus[ch.id] = isLive ? 'live' : 'dead'
        checked++

        const batchSize = BATCH_SIZES[flushCount] ?? 50
        if (checked - lastFlush >= batchSize || checked === total) {
          lastFlush = checked
          flushCount++
          flush()
        }
      }
    }

    const workers = Array.from({ length: CONCURRENCY }, () => worker())
    Promise.allSettled(workers).then(() => {
      if (runCounter.current !== currentRun) return
      if (!controller.signal.aborted) {
        storeSet({ lastLiveCheckAt: Date.now() })
        flush()
      }
    })

    return () => {
      controller.abort()
    }
  }, [])

  return { isRunning: liveCheckProgress.isRunning, progress: liveCheckProgress }
}
