# LiveTV — Agent instructions

## Commands
- `npm run dev` — Vite dev server
- `npm run build` — production build (chunk warning limit: 1500 kB)
- `npm run lint` — ESLint 10 flat config (`.jsx` only, no TypeScript)
- `npm run preview` — serve production build locally
- No test framework or test script exists

## Architecture
- **Stack**: React 19 + Vite 8 + Tailwind CSS 4 + Zustand 5 + HLS.js + Framer Motion + React Router 7
- **Entry**: `index.html` → `src/main.jsx` (HelmetProvider → BrowserRouter → Layout)
- **Routing**: All pages lazy-loaded with `AnimatePresence` page transitions (`src/app/routes.jsx`)
- **State**: Zustand store persisted to localStorage under key `live-tv-v2` (`src/store/tvStore.js`)
- **Channel data**: `src/lib/allChannels.js` imports from `src/lib/multipleChannelData.js`. Exports pre-built `channelIndex` (Map), `channelsByCategory` (Map), `allCategories`, and `byIds()` helper.
- **Build chunks**: `manualChunks` splits hls.js→`player`, framer-motion→`framer`, lucide-react→`ui`. React+ReactDOM stay in one chunk always.
- **PWA**: vite-plugin-pwa with Workbox. Shell cached via globPatterns; m3u8/ts URLs excluded via `navigateFallbackDenylist`. Channel logos cached `NetworkFirst` (7 days, 200 entries, 5s network timeout).
- **Deployment**: Vercel SPA rewrites (`vercel.json`). Demo on Netlify (README).

## Key quirks
- Tailwind v4 uses `@import "tailwindcss"` (no `tailwind.config.js`/PostCSS). Custom `tv:` variant at 1800×900+ for TV displays.
- `useLiveChecker` fires once on mount, fetches each channel URL (25 concurrent, 5s timeout), rechecks only after 24h stale. Sets `liveStatus[id]` to `'live'` or `'dead'`.
- Stream URLs upgraded http→https in `VideoPlayer` to avoid mixed-content errors.
- Channel `id` format: `{sourceSlug}-{slugified-name}`. Deduplicated by URL. Somoy TV pinned to position 0.
- Adult channels (`isAdult: true`) exist in data; `adultContentEnabled` setting in store controls visibility.
- No TypeScript — all `.jsx`. No `tailwind.config.js`. No `postcss.config.js`.
- `scripts/test_channels.py` validates streams offline (Python, requires `requests`). Not part of npm lifecycle.

## Style & conventions
- Category names normalized via `CATEGORY_MAP` with fuzzy fallbacks. `XXX` is the adult category.
- Channels have a `_search` field pre-built at load (name + category + sourceName, lowercased) — do not rebuild on every keystroke.
- Recently watched capped at 18 entries. Limit when adding.
- `channelIndex` Map (O(1)) is preferred over `array.find()` for channel lookups.
- Player page at `/live/:id` — route redirects `/live` → `/`.
- CSS custom classes: `.player-button`, `.quality-select-wrap`, `.quality-select`, `.no-scrollbar`, `.line-clamp-2`. Tailwind `tv:` variant for large screens.
