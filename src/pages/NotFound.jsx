import { Link } from 'react-router-dom'
import { Home, Satellite } from 'lucide-react'
import Seo from '../components/Seo'

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center">
      <Seo title="404" description="The requested page could not be found on Live TV." noIndex />
      <div className="max-w-xl">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-white/10 bg-white/[0.07] text-cyan-200 tv:h-32 tv:w-32">
          <Satellite className="h-10 w-10 tv:h-20 tv:w-20" />
        </div>
        <h1 className="mt-6 text-5xl font-black tv:text-8xl">404</h1>
        <p className="mt-3 text-xl font-bold tv:text-4xl">Signal lost</p>
        <p className="mt-2 text-white/55 tv:text-2xl">That page is not available in this live TV lineup.</p>
        <Link
          to="/"
          className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/70 tv:min-h-20 tv:px-10 tv:text-3xl"
        >
          <Home className="h-5 w-5 tv:h-9 tv:w-9" />
          Back Home
        </Link>
      </div>
    </div>
  )
}
