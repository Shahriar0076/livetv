import { useEffect, useState } from 'react'
import { Radio, RotateCcw, Settings as SettingsIcon, ShieldAlert, Volume2, Zap, Eye } from 'lucide-react'
import { useTvStore } from '../store/tvStore'
import Seo from '../components/Seo'

const isMobileDevice = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

function ToggleSwitch({ checked, onChange, id, disabled = false }) {
  return (
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Toggle switch"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full',
          'border transition-all duration-200 ease-in-out',
          'focus:outline-none focus:ring-2 focus:ring-violet-400/50',
          disabled ? 'cursor-not-allowed opacity-60' : '',
          checked
            ? 'border-violet-400/60 bg-violet-600'
            : 'border-white/15 bg-white/10',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none block h-5 w-5 rounded-full',
            'bg-white shadow-md ring-1 ring-black/10',
            'transform transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
  )
}

function SettingRow({ id, title, description, checked, onChange, danger = false, disabled = false }) {
  return (
    <label
      htmlFor={id}
      className={[
        'flex items-center justify-between gap-4 rounded-2xl border p-4 backdrop-blur-xl transition tv:p-6',
        disabled ? 'cursor-default' : 'cursor-pointer',
        danger
          ? 'border-orange-400/20 bg-orange-500/[0.06] hover:bg-orange-500/[0.10]'
          : 'border-white/[0.07] bg-white/[0.05] hover:bg-white/[0.08]',
      ].join(' ')}
    >
      <span>
        <span className={`block text-sm font-bold tv:text-xl ${danger ? 'text-orange-200' : ''}`}>{title}</span>
        <span className="mt-0.5 block text-xs text-white/45 tv:text-base">{description}</span>
      </span>
      <ToggleSwitch id={id} checked={checked} onChange={onChange} disabled={disabled} />
    </label>
  )
}

function AdultContentModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-3xl border border-orange-400/20 bg-[#12080c] p-6 shadow-2xl shadow-orange-900/30">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-orange-400/30 bg-orange-500/15 text-orange-300">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-black text-orange-200">18+ Content Warning</h2>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          You are about to enable adult content. By proceeding, you confirm that you are{' '}
          <strong className="text-white">18 years of age or older</strong> and agree that this content is appropriate for you.
        </p>
        <p className="mt-2 text-xs text-white/35">
          This preference is saved locally on your device and can be turned off in Settings at any time.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.06] py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/[0.10]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-600/25 transition hover:from-orange-400 hover:to-red-400"
          >
            I'm 18+ — Enable
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/35">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  )
}

export default function Settings() {
  const settings = useTvStore((state) => state.settings)
  const updateSettings = useTvStore((state) => state.updateSettings)
  const clearRecentlyWatched = useTvStore((state) => state.clearRecentlyWatched)
  const liveCheckProgress = useTvStore((state) => state.liveCheckProgress)
  const resetLiveStatus = useTvStore((state) => state.resetLiveStatus)
  const [showAdultModal, setShowAdultModal] = useState(false)
  const [isMobile] = useState(() => isMobileDevice())

  useEffect(() => {
    if (isMobile) {
      updateSettings({ prebuffer: true })
    }
  }, [isMobile, updateSettings])

  const handleAdultToggle = (value) => {
    if (value) {
      setShowAdultModal(true)
    } else {
      updateSettings({ adultContentEnabled: false })
    }
  }

  return (
    <>
      {showAdultModal && (
        <AdultContentModal
          onConfirm={() => {
            updateSettings({ adultContentEnabled: true })
            setShowAdultModal(false)
          }}
          onCancel={() => setShowAdultModal(false)}
        />
      )}

      <div className="mx-auto max-w-2xl space-y-6 tv:max-w-4xl tv:space-y-10">
        <Seo
          title="Settings"
          description="Manage Live TV playback preferences, volume defaults, autoplay, and content settings."
          noIndex
        />

        {/* Header */}
        <header>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-widest text-violet-300">
            <SettingsIcon className="h-3 w-3" />
            Preferences
          </div>
          <h1 className="text-3xl font-black sm:text-4xl tv:text-6xl">Settings</h1>
          <p className="mt-1 text-sm text-white/40 tv:text-xl">Saved on this device.</p>
        </header>

        {/* Playback */}
        <section className="space-y-2">
          <SectionTitle icon={Zap} label="Playback" />
          <SettingRow
            id="autoplay"
            title="Autoplay live streams"
            description="Start playback as soon as a live channel is ready."
            checked={settings.autoplay}
            onChange={(autoplay) => updateSettings({ autoplay })}
          />
          <SettingRow
            id="muted"
            title="Start muted"
            description="Open streams muted until you turn sound on."
            checked={settings.muted}
            onChange={(muted) => updateSettings({ muted })}
          />
          <SettingRow
            id="reducedMotion"
            title="Reduce motion"
            description="Calmer transitions on lower-power displays."
            checked={settings.reducedMotion}
            onChange={(reducedMotion) => updateSettings({ reducedMotion })}
          />
          <SettingRow
            id="prebuffer"
            title="Pre-buffer streams"
            description={isMobile ? 'Automatically enabled on mobile for smoother playback.' : 'Load extra stream data upfront to reduce buffering on slower connections. Auto-enabled on mobile.'}
            checked={settings.prebuffer}
            onChange={(prebuffer) => updateSettings({ prebuffer })}
            disabled={isMobile}
          />
        </section>

        {/* Volume */}
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.05] p-4 tv:p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-violet-300" />
              <span className="text-sm font-bold tv:text-xl">Default Volume</span>
            </div>
            <span className="rounded-lg border border-white/[0.08] bg-black/30 px-2.5 py-1 text-xs font-black text-violet-200">
              {Math.round(settings.volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.volume}
            onChange={(e) =>
              updateSettings({ volume: Number(e.target.value), muted: Number(e.target.value) === 0 })
            }
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-violet-500 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-violet-500/40"
          />
        </section>

        {/* Content Filters — hidden */}
        <section className="space-y-2" style={{ display: 'none' }}>
          <SectionTitle icon={Eye} label="Content Filters" />
          <SettingRow
            id="adultContent"
            title="Enable 18+ Adult Content"
            description="Show adult channels. Requires age confirmation. Saved locally."
            checked={settings.adultContentEnabled}
            onChange={handleAdultToggle}
            danger
          />
        </section>

        {/* Actions */}
        <section className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={clearRecentlyWatched}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.06] px-4 text-sm font-bold text-white/70 transition hover:bg-white/[0.10] focus:outline-none focus:ring-2 focus:ring-violet-400/60 tv:h-16 tv:text-xl"
          >
            <RotateCcw className="h-4 w-4" />
            Clear Recently Watched
          </button>
          <button
            type="button"
            onClick={() => {
              if (!liveCheckProgress.isRunning) {
                resetLiveStatus()
                window.location.reload()
              }
            }}
            disabled={liveCheckProgress.isRunning}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.06] px-4 text-sm font-bold text-white/70 transition hover:bg-white/[0.10] focus:outline-none focus:ring-2 focus:ring-violet-400/60 disabled:opacity-40 tv:h-16 tv:text-xl"
          >
            <Radio className="h-4 w-4" />
            {liveCheckProgress.isRunning ? 'Checking...' : 'Re-check Live Status'}
          </button>
        </section>
      </div>
    </>
  )
}
