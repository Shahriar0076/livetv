import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Include icons in the precache
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Live TV',
        short_name: 'Live TV',
        description: 'Watch live IPTV channels — favorites, search, categories, HLS playback.',
        theme_color: '#07080f',
        background_color: '#07080f',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache app shell: JS/CSS chunks, HTML, fonts, SVGs, local images
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Never cache stream URLs, m3u8 playlists, or external API calls
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /\.m3u8$/, /\.ts$/],
        runtimeCaching: [
          {
            // Cache channel logos (remote images) with network-first, fall back to cache
            urlPattern: /^https?:\/\/.*\.(png|jpg|jpeg|svg|webp|gif)(\?.*)?$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'channel-logos',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  build: {
    // Raise chunk warning threshold (channel data is intentionally large)
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        /**
         * manualChunks — keep react + react-dom ALWAYS together in one chunk.
         * Splitting them apart causes duplicate React instances and broken hooks.
         * Only split unrelated heavy vendor libs (hls.js, framer-motion, etc.).
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          // hls.js is ~500 kB — isolate so it only loads on the Player page
          if (id.includes('hls.js')) return 'player'

          // framer-motion ~130 kB — separate cached chunk
          if (id.includes('framer-motion')) return 'framer'

          // lucide icons ~11 kB — separate cached chunk
          if (id.includes('lucide-react')) return 'ui'

          // zustand ~2.5 kB — keep with react-router in a shared vendor chunk
          // react + react-dom MUST stay in the same chunk (default vendor)
          // so we do NOT split them here — let Vite handle them automatically
        },
      },
    },
  },
})
