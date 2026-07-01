import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Tv2 } from 'lucide-react'

const STORAGE_KEY_DISMISSED = 'pwa_dismissed_until'
const STORAGE_KEY_INSTALLED = 'pwa_installed'
const SNOOZE_DAYS = 3

function isInstalled() {
  // Check standalone display mode (installed PWA) or iOS fullscreen
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isDismissedRecently() {
  const until = localStorage.getItem(STORAGE_KEY_DISMISSED)
  if (!until) return false
  return Date.now() < Number(until)
}

function markInstalled() {
  localStorage.setItem(STORAGE_KEY_INSTALLED, '1')
}

function snooze() {
  const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000
  localStorage.setItem(STORAGE_KEY_DISMISSED, String(until))
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Never show if already installed or previously installed via our prompt
    if (isInstalled() || localStorage.getItem(STORAGE_KEY_INSTALLED)) return
    // Never show if snoozed within the last 3 days
    if (isDismissedRecently()) return

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Small delay so it doesn't pop up immediately on first paint
      setTimeout(() => setVisible(true), 1500)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Also handle the case where the app was already installed externally
    window.addEventListener('appinstalled', () => {
      markInstalled()
      setVisible(false)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      markInstalled()
    }
    setDeferredPrompt(null)
    setVisible(false)
  }

  const handleDismiss = () => {
    snooze()
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop — subtle dark overlay */}
          <motion.div
            key="install-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          {/* Install banner — slides up from bottom */}
          <motion.div
            key="install-banner"
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '110%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] mx-auto max-w-lg px-3 pb-4 sm:px-6 sm:pb-6"
          >
            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0d0b1e]/95 shadow-[0_-4px_40px_rgba(139,92,246,0.25)] backdrop-blur-2xl">
              {/* Purple glow accent */}
              <div className="pointer-events-none absolute -top-16 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full bg-purple-600/20 blur-2xl" />

              <div className="relative flex items-start gap-4 p-5 sm:p-6">
                {/* App icon */}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30">
                  <Tv2 className="h-8 w-8 text-white" />
                </div>

                {/* Text content */}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-black text-white">Install Live TV</p>
                  <p className="mt-0.5 text-sm leading-snug text-white/60">
                    Add to your home screen for faster access and the best experience — works offline too.
                  </p>

                  {/* Action buttons */}
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      id="pwa-install-btn"
                      type="button"
                      onClick={handleInstall}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/30 transition hover:from-amber-300 hover:to-orange-400 hover:shadow-orange-400/40 focus:outline-none focus:ring-4 focus:ring-orange-400/40 active:scale-95"
                    >
                      <Download className="h-4 w-4" />
                      Install App
                    </button>
                    <button
                      id="pwa-dismiss-btn"
                      type="button"
                      onClick={handleDismiss}
                      className="text-sm font-semibold text-white/45 transition hover:text-white/75 focus:outline-none"
                    >
                      Not now
                    </button>
                  </div>
                </div>

                {/* Close X */}
                <button
                  id="pwa-close-btn"
                  type="button"
                  onClick={handleDismiss}
                  aria-label="Close install prompt"
                  className="shrink-0 rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white focus:outline-none"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
