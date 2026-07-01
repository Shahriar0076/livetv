import { getStore } from '@netlify/blobs'
import allChannels from '../../src/lib/allChannels.js'

const CONCURRENCY = 25
const TIMEOUT_MS = 5000

async function checkChannel(url, signal) {
  try {
    const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS)
    const combined = AbortSignal.any
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal

    const response = await fetch(url, {
      method: 'GET',
      signal: combined,
    })

    if (!response.ok) return false

    const ct = response.headers.get('content-type') || ''
    if (ct.includes('audio') || ct.includes('video')) return true
    if (ct.includes('mpegurl') || ct.includes('x-mpegURL') || ct.includes('vnd.apple.mpegurl')) return true

    const reader = response.body?.getReader()
    if (!reader) return false
    const { value, done } = await reader.read()
    reader.cancel()
    if (done || !value) return false
    const head = new TextDecoder().decode(value.slice(0, 512))
    return head.includes('#EXTM3U') || head.includes('#EXTINF')
  } catch {
    return false
  }
}

export default async () => {
  const NON_STREAM_RE = /\.(mp4|mkv|avi|webm|mov|flv|wmv|m4v|mpg|mpeg)$/i
  const channels = allChannels.filter((ch) => ch.url && !NON_STREAM_RE.test(ch.url))
  const total = channels.length
  if (total === 0) {
    console.error('No channels to check')
    return { statusCode: 500, body: JSON.stringify({ error: 'No channels found' }) }
  }

  const statuses = {}
  let nextIndex = 0

  console.log(`Checking ${total} channels with ${CONCURRENCY} concurrent workers...`)

  const controller = new AbortController()
  const timeout = setTimeout(() => {
    console.warn('Global timeout reached, aborting remaining checks')
    controller.abort()
  }, 10 * 60 * 1000)

  async function worker() {
    while (!controller.signal.aborted) {
      const index = nextIndex++
      if (index >= total) break

      const ch = channels[index]
      if (!ch) break

      const isLive = await checkChannel(ch.url, controller.signal)
      if (controller.signal.aborted) return

      statuses[ch.id] = isLive ? 'live' : 'dead'
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker())
  await Promise.allSettled(workers)
  clearTimeout(timeout)

  const checked = Object.keys(statuses).length
  const live = Object.values(statuses).filter((s) => s === 'live').length
  const dead = Object.values(statuses).filter((s) => s === 'dead').length

  const result = {
    statuses,
    checkedAt: Date.now(),
    total: checked,
    live,
    dead,
  }

  console.log(`Done. Live: ${live}, Dead: ${dead}, Total: ${checked}`)

  try {
    const store = getStore('channel-status-store')
    await store.setJSON('latest', result)
    console.log('Saved to Netlify Blobs')
  } catch (err) {
    console.error('Failed to save to Netlify Blobs:', err)
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  }
}
