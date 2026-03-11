import { useNavigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'

export default function ModeSelect() {
  const navigate = useNavigate()
  const branding = useAppStore((s) => s.branding)

  const handleUserMode = () => {
    document.documentElement.requestFullscreen?.()
    navigate('/idle')
  }

  const handleAdminMode = () => {
    navigate('/admin/login')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-16">
      <div className="flex flex-col items-center gap-4">
        {branding.logoDataUrl ? (
          <img src={branding.logoDataUrl} alt="Logo" className="h-20 w-auto object-contain" />
        ) : (
          <span className="text-5xl">📸</span>
        )}
        <h1 className="text-4xl font-bold text-brand-text tracking-tight">{branding.studioName}</h1>
        {branding.tagline && (
          <p className="text-brand-text/50 text-sm tracking-wide">{branding.tagline}</p>
        )}
        <p className="text-brand-text/30 text-xs tracking-widest uppercase mt-1">Select Mode</p>
      </div>

      <div className="flex gap-8">
        <button
          onClick={handleUserMode}
          className="flex flex-col items-center gap-4 w-56 py-10 bg-[#e94560] rounded-3xl active:scale-95 transition hover:opacity-90"
        >
          <span className="text-5xl">🙋</span>
          <div className="flex flex-col items-center gap-1">
            <span className="text-white text-2xl font-bold">User</span>
            <span className="text-white/60 text-sm">Mulai sesi foto</span>
          </div>
        </button>

        <button
          onClick={handleAdminMode}
          className="flex flex-col items-center gap-4 w-56 py-10 bg-brand-surface border border-white/10 rounded-3xl active:scale-95 transition hover:border-white/30"
        >
          <span className="text-5xl">⚙️</span>
          <div className="flex flex-col items-center gap-1">
            <span className="text-brand-text text-2xl font-bold">Admin</span>
            <span className="text-brand-text/40 text-sm">Settings & konfigurasi</span>
          </div>
        </button>
      </div>
    </div>
  )
}
