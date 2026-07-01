import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Loading from '../components/Loading'

const Home = lazy(() => import('../pages/Home'))
const Player = lazy(() => import('../pages/Player'))
const Favorites = lazy(() => import('../pages/Favorites'))
const Category = lazy(() => import('../pages/Category'))
const Search = lazy(() => import('../pages/Search'))
const Settings = lazy(() => import('../pages/Settings'))
const NotFound = lazy(() => import('../pages/NotFound'))

function PageFrame({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="min-h-full"
    >
      {children}
    </motion.div>
  )
}

export default function AppRoutes() {
  const location = useLocation()

  return (
    <Suspense fallback={<Loading label="Tuning live channels" />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageFrame><Home /></PageFrame>} />
          <Route path="/live" element={<Navigate to="/" replace />} />
          <Route path="/live/:id" element={<PageFrame><Player /></PageFrame>} />
          <Route path="/favorites" element={<PageFrame><Favorites /></PageFrame>} />
          <Route path="/category/:name" element={<PageFrame><Category /></PageFrame>} />
          <Route path="/search" element={<PageFrame><Search /></PageFrame>} />
          <Route path="/settings" element={<PageFrame><Settings /></PageFrame>} />
          <Route path="*" element={<PageFrame><NotFound /></PageFrame>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  )
}
