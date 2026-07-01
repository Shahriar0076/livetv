import { BrowserRouter, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { RadioTower } from 'lucide-react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import AppRoutes from './app/routes'
import useKeyboardNavigation from './hooks/useKeyboardNavigation'
import useLiveChecker from './hooks/useLiveChecker'
import InstallPrompt from './components/InstallPrompt'
import { useTvStore } from './store/tvStore'

function LiveCheckIndicator() {
  const progress = useTvStore((state) => state.liveCheckProgress)
  if (!progress.isRunning || progress.total === 0) return null
  const pct = Math.round((progress.checked / progress.total) * 100)
  return (
    <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-black/80 px-3 py-1.5 text-[0.65rem] font-semibold text-white/60 backdrop-blur-xl sm:bottom-4 lg:left-auto lg:right-4 tv:text-sm">
      <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
      Checking channels… {progress.checked}/{progress.total} ({pct}%)
    </div>
  )
}

function InitialLoadOverlay() {
  const progress = useTvStore((state) => state.liveCheckProgress)
  const liveStatus = useTvStore((state) => state.liveStatus)

  const show = progress.isRunning && Object.keys(liveStatus).length === 0 && progress.total > 0

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="initial-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07080f]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_-10%,rgba(139,92,246,0.22),transparent_40%),radial-gradient(ellipse_at_80%_80%,rgba(217,70,239,0.14),transparent_40%),linear-gradient(160deg,#07080f_0%,#0d0b1e_50%,#070d14_100%)]" />
          <div className="relative flex flex-col items-center gap-6">
            {/* Spinner */}
            <div className="relative h-20 w-20">
              <svg className="absolute inset-0 h-full w-full animate-spin" viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="24" stroke="rgb(255 255 255 / 0.08)" strokeWidth="3" />
                <circle
                  cx="28" cy="28" r="24"
                  stroke="url(#spinnerGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="75.4"
                  strokeDashoffset="56"
                />
                <defs>
                  <linearGradient id="spinnerGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="rgb(139 92 246)" />
                    <stop offset="100%" stopColor="rgb(217 70 239)" />
                  </linearGradient>
                </defs>
              </svg>
              <RadioTower className="absolute inset-0 m-auto h-8 w-8 text-violet-300" />
            </div>

            <div className="text-center space-y-2">
              <p className="text-xl font-black tracking-tight">Please wait…</p>
              <p className="text-sm font-medium text-white/50">Checking live channel availability</p>
            </div>

            {progress.total > 0 && (
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/[0.06] tv:w-72">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                    animate={{ width: `${Math.round((progress.checked / progress.total) * 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-xs font-semibold text-white/40 tabular-nums">
                  {progress.checked}/{progress.total}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Layout() {
  const location = useLocation()
  const isPlayer = location.pathname.startsWith('/live/')
  useKeyboardNavigation({ enabled: !isPlayer })
  useLiveChecker()

  return (
    <div className="min-h-screen bg-[#07080f] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_-10%,rgba(139,92,246,0.22),transparent_40%),radial-gradient(ellipse_at_80%_80%,rgba(217,70,239,0.14),transparent_40%),radial-gradient(ellipse_at_50%_50%,rgba(99,102,241,0.08),transparent_60%),linear-gradient(160deg,#07080f_0%,#0d0b1e_50%,#070d14_100%)]" />
      {!isPlayer && <Sidebar />}
      {!isPlayer && <Navbar />}
      <main className={isPlayer ? 'min-h-screen' : 'min-h-screen px-4 pb-20 pt-16 sm:px-6 lg:pl-32 lg:pr-8 lg:pt-20 xl:pl-36'}>
        <AppRoutes />
      </main>
      {!isPlayer && <BottomNav />}
      <LiveCheckIndicator />
      <InitialLoadOverlay />
      <InstallPrompt />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}

