import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const uniqueIds = (ids) => {
  const seen = new Set()
  return ids.filter((id) => {
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

const isMobileDevice = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

export const useTvStore = create(
  persist(
    (set, get) => ({
      favoriteIds: [],
      recentlyWatchedIds: [],
      currentChannelId: null,
      settings: {
        autoplay: true,
        muted: false,
        volume: 0.85,
        streamQuality: 'auto',
        reducedMotion: false,
        adultContentEnabled: false,
        prebuffer: isMobileDevice(),
      },
      // ─── Live status ────────────────────────────────────────────────────
      liveStatus: {},
      lastLiveCheckAt: null,
      liveCheckVersion: 0,
      liveCheckProgress: { checked: 0, total: 0, isRunning: false },

      setLiveStatus: (id, status) => {
        set((state) => ({
          liveStatus: { ...state.liveStatus, [id]: status },
          liveCheckVersion: state.liveCheckVersion + 1,
        }))
      },
      setManyLiveStatus: (updates) => {
        set((state) => ({
          liveStatus: { ...state.liveStatus, ...updates },
          liveCheckVersion: state.liveCheckVersion + 1,
        }))
      },
      setLiveCheckProgress: (checked, total, isRunning) => {
        set({ liveCheckProgress: { checked, total, isRunning } })
      },
      isChannelLive: (id) => {
        const status = get().liveStatus[id]
        return status === 'live'
      },
      resetLiveStatus: () => {
        set({ liveStatus: {}, lastLiveCheckAt: null })
      },
      bumpLiveCheckVersion: () => {
        set((s) => ({ liveCheckVersion: s.liveCheckVersion + 1 }))
      },
      // ────────────────────────────────────────────────────────────────────
      setCurrentChannel: (channel) => {
        if (!channel?.id) return
        set({ currentChannelId: channel.id })
        get().addRecentlyWatched(channel.id)
      },
      addRecentlyWatched: (id) => {
        if (!id) return
        set((state) => ({
          recentlyWatchedIds: uniqueIds([id, ...state.recentlyWatchedIds]).slice(0, 18),
        }))
      },
      toggleFavorite: (channel) => {
        if (!channel?.id) return
        set((state) => {
          const exists = state.favoriteIds.includes(channel.id)
          return {
            favoriteIds: exists
              ? state.favoriteIds.filter((id) => id !== channel.id)
              : uniqueIds([channel.id, ...state.favoriteIds]),
          }
        })
      },
      isFavorite: (id) => get().favoriteIds.includes(id),
      updateSettings: (settings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...settings,
          },
        }))
      },
      removeRecentlyWatched: (id) => {
        set((state) => ({
          recentlyWatchedIds: state.recentlyWatchedIds.filter((rid) => rid !== id),
        }))
      },
      clearRecentlyWatched: () => set({ recentlyWatchedIds: [] }),
    }),
    {
      name: 'live-tv-v2',
      partialize: (state) => ({
        favoriteIds: state.favoriteIds,
        recentlyWatchedIds: state.recentlyWatchedIds,
        currentChannelId: state.currentChannelId,
        settings: state.settings,
        liveStatus: state.liveStatus,
        lastLiveCheckAt: state.lastLiveCheckAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        if (isMobile && state.settings.prebuffer === false) {
          state.updateSettings({ prebuffer: true })
        }
      },
    },
  ),
)
