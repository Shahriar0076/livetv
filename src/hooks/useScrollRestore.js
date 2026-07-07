import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const STORAGE_PREFIX = 'scrollpos:'
const DEBOUNCE_MS = 200

// ── Bootstrap: disable built-in scroll restoration ────────────────────────
// Without this, the browser races our custom logic on popstate.
if (typeof history !== 'undefined' && history.scrollRestoration === 'auto') {
  try { history.scrollRestoration = 'manual' } catch { /* noop */ }
}

// ── Save scroll position BEFORE history.pushState / replaceState ────────
// The save-inside-useEffect-cleanup fires AFTER React has already
// committed the *next* page's DOM — by then window.scrollY reflects the
// *new* page's height (often 0 for the fullscreen Player), so the save
// is either skipped (y <= 0) or writes a wrong value.  By patching the
// history methods we capture the scroll while the outgoing page's DOM is
// still intact and scrollY is correct.
const saveBeforeNavigate = () => {
  const key = STORAGE_PREFIX + window.location.pathname
  const y = window.scrollY
  if (y > 0) {
    try { sessionStorage.setItem(key, String(y)) } catch { /* noop */ }
  }
}

const ORIG_PUSH = history.pushState.bind(history)
history.pushState = function (...args) {
  saveBeforeNavigate()
  return ORIG_PUSH(...args)
}

const ORIG_REPLACE = history.replaceState.bind(history)
history.replaceState = function (...args) {
  saveBeforeNavigate()
  return ORIG_REPLACE(...args)
}

/**
 * Saves the current page's scroll position when scrolling (debounced)
 * and when navigating away. Restores it when the page mounts again.
 *
 * Call this at the top of any page component that should remember its
 * scroll position (Home, Category, Favorites, Search, etc.).
 */
export default function useScrollRestore() {
  const location = useLocation()
  const { pathname } = location

  // ── Restore scroll position on page mount / route change ──────────────
  useEffect(() => {
    const key = STORAGE_PREFIX + pathname
    let saved
    try {
      saved = sessionStorage.getItem(key)
    } catch {
      /* sessionStorage unavailable (private browsing, etc.) */
    }
    if (!saved) return

    const y = parseInt(saved, 10)
    if (isNaN(y) || y <= 0) return

    // Temporarily override the global scroll-behavior:smooth so the
    // restore jump is instant, not animated.
    const html = document.documentElement
    const prevBehavior = html.style.scrollBehavior
    html.style.scrollBehavior = 'auto'
    window.scrollTo(0, y)
    // Restore the CSS behaviour after the next paint.
    requestAnimationFrame(() => {
      html.style.scrollBehavior = prevBehavior
    })
  }, [pathname])

  // ── Save scroll position on user scroll (debounced) + on cleanup ──────
  useEffect(() => {
    const key = STORAGE_PREFIX + pathname
    let debounceId = null

    const handleScroll = () => {
      if (debounceId) clearTimeout(debounceId)
      debounceId = setTimeout(() => {
        const y = window.scrollY
        if (y > 0) {
          try {
            sessionStorage.setItem(key, String(y))
          } catch {
            /* storage full or unavailable */
          }
        }
      }, DEBOUNCE_MS)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll, { passive: true })
      if (debounceId) clearTimeout(debounceId)
    }
  }, [pathname])
}
