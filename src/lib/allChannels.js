import { CODE_CLOUD_BD, MRGIFY_TV, PRIATES_TV, AKASH_TV, DEKHO_PRIME, ADULT_IPTV } from './multipleChannelData'

// ─── Category normalisation ───────────────────────────────────────────────────

const CATEGORY_MAP = {
  sports: 'Sports',
  news: 'News',
  movies: 'Movies',
  music: 'Music',
  cartoon: 'Cartoon',
  kids: 'Kids',
  documentary: 'Documentary',
  religion: 'Religion',
  bangla: 'Bangla',
  entertainment: 'Entertainment',
  xxx: 'XXX',
}

function normalizeCategory(raw) {
  if (!raw) return 'General'
  const key = raw.trim().toLowerCase()
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key]
  // Fuzzy fallbacks for future data additions
  if (key.includes('sports')) return 'Sports'
  if (key.includes('news')) return 'News'
  if (key.includes('movie')) return 'Movies'
  if (key.includes('music')) return 'Music'
  if (key.includes('cartoon')) return 'Cartoon'
  if (key.includes('religion') || key.includes('islamic') || key.includes('religious')) return 'Religion'
  if (key.includes('bangla')) return 'Bangla'
  if (key.includes('documentary') || key.includes('info')) return 'Documentary'
  return raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1)
}

// ─── Source normalisation ─────────────────────────────────────────────────────

function slugify(text) {
  if (!text) return ''
  return String(text)
    .normalize('NFKD') // Normalize unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '') // Remove invalid chars
    .replace(/\s+/g, '-') // Collapse whitespace to dash
    .replace(/-+/g, '-') // Collapse multiple dashes
}

/**
 * Converts a source's data array into normalised channel objects.
 * Fields: id, name, category, logo, url, isAdult, sourceSlug, sourceName, _search
 */
function normalizeSource(source) {
  if (!source || !Array.isArray(source.data)) return []
  return source.data.map((item) => {
    const name = item.tvgName || item.title || 'Unknown'
    const category = normalizeCategory(item.groupTitle)
    const sourceName = source.name
    return {
      _rawId: item.tvgId || item.title,
      name,
      category,
      logo: item.tvgLogo || null,
      url: item.url || '',
      isAdult: source.isAdult === true,
      sourceSlug: source.slug,
      sourceName,
      number: null,
      // Pre-built lowercase search string — avoids template-literal concat on every keystroke
      _search: `${name} ${category} ${sourceName}`.toLowerCase(),
    }
  })
}

// ─── Build channel list ───────────────────────────────────────────────────────

const multiSources = [CODE_CLOUD_BD, MRGIFY_TV, PRIATES_TV, AKASH_TV, DEKHO_PRIME, ADULT_IPTV]
const rawChannels = multiSources.flatMap(normalizeSource)

const seenUrls = new Set()
const seenIds = new Set()
const allChannels = []

// URLs ending in common video file extensions are direct downloads, not live streams
const NON_STREAM_RE = /\.(mp4|mkv|avi|webm|mov|flv|wmv|m4v|mpg|mpeg)$/i

for (const ch of rawChannels) {
  if (!ch.url) continue
  if (seenUrls.has(ch.url)) continue
  if (NON_STREAM_RE.test(ch.url)) continue

  seenUrls.add(ch.url)
  
  // Generate perfect slug
  let baseSlug = slugify(ch._rawId || ch.name || 'channel')
  let finalId = `${ch.sourceSlug}-${baseSlug}`
  
  // Ensure strict uniqueness for the Map
  let counter = 1
  while (seenIds.has(finalId)) {
    finalId = `${ch.sourceSlug}-${baseSlug}-${counter}`
    counter++
  }
  
  seenIds.add(finalId)
  ch.id = finalId
  delete ch._rawId
  
  allChannels.push(ch)
}

// ─── Pin Somoy TV to top ──────────────────────────────────────────────────────

const somoyIndex = allChannels.findIndex((ch) => ch.name.toLowerCase().includes('somoy'))
if (somoyIndex > 0) {
  const [somoy] = allChannels.splice(somoyIndex, 1)
  allChannels.unshift(somoy)
}

// ─── Pre-built indices (computed once at module load, O(1) access everywhere) ─

/**
 * Map<id, channel> — O(1) lookup by ID, used in Player, Favorites, byIds()
 */
export const channelIndex = new Map(allChannels.map((ch) => [ch.id, ch]))

/**
 * Map<category, channel[]> — sorted A→Z per category (case-insensitive).
 * Used in Category page for instant O(1) category lookup.
 * Both adult and non-adult are stored; callers filter by isAdult themselves.
 */
export const channelsByCategory = (() => {
  const map = new Map()
  for (const ch of allChannels) {
    const list = map.get(ch.category)
    if (list) list.push(ch)
    else map.set(ch.category, [ch])
  }
  // Sort each bucket A→Z
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }
  return map
})()

/**
 * Sorted list of all unique category names (excluding XXX).
 * Pre-built so CategoryFilter never recomputes it.
 */
export const allCategories = Array.from(channelsByCategory.keys())
  .filter((c) => c !== 'XXX')
  .sort()

/**
 * Resolve an array of IDs → channels in O(1) per ID using channelIndex.
 * Preserves ID order; skips missing entries.
 */
export function byIds(ids) {
  const result = []
  for (const id of ids) {
    const ch = channelIndex.get(id)
    if (ch) result.push(ch)
  }
  return result
}

export default allChannels
