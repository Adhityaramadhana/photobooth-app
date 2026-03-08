import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ModeSelect() {
  const navigate = useNavigate()
  const [studioName, setStudioName] = useState('PHOTOBOOTH')

  useEffect(() => {
    window.electronAPI.admin.getSettings().then(({ settings }) => {
      const name = settings?.branding?.studioName
      if (name) setStudioName(name)
    }).catch(() => {})
  }, [])

  const handleUserMode = () => {
    // Masuk fullscreen saat user mode
    document.documentElement.requestFullscreen?.()
    navigate('/idle')
  }

  const handleAdminMode = () => {
    navigate('/admin/login')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-16">
      <div className="flex flex-col items-center gap-3">
        <span className="text-5xl">📸</span>
        <h1 className="text-4xl font-bold text-brand-text tracking-tight">{studioName}</h1>
        <p className="text-brand-text/30 text-sm tracking-widest uppercase">Select Mode</p>
      </div>

      <div className="flex gap-8">
        <button
          onClick={handleUserMode}
          className="flex flex-col items-center gap-4 w-56 py-10 bg-brand-secondary rounded-3xl active:scale-95 transition hover:opacity-90"
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
