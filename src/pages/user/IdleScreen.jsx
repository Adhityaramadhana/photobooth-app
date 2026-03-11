import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'

export default function IdleScreen() {
  const navigate = useNavigate()
  const { setCameraStatus, setCameraModel, clearSession } = useAppStore()
  const branding = useAppStore((s) => s.branding)

  useEffect(() => { clearSession() }, [])

  useEffect(() => {
    const initCamera = async () => {
      try {
        const { running } = await window.electronAPI.camera.checkService()
        if (!running) return
        const { cameras } = await window.electronAPI.camera.getList()
        if (!cameras?.length) return
        setCameraStatus('connecting')
        const { success, model } = await window.electronAPI.camera.connect(cameras[0])
        if (success) {
          setCameraStatus('connected')
          setCameraModel(model)
        }
      } catch {
        // silent
      }
    }
    initCamera()
  }, [])

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen cursor-pointer select-none"
      onClick={() => navigate('/payment')}
    >
      <div className="flex flex-col items-center gap-6">
        {branding.logoDataUrl ? (
          <img src={branding.logoDataUrl} alt="Logo" className="h-32 w-auto object-contain" />
        ) : (
          <div className="w-32 h-32 rounded-full bg-brand-secondary flex items-center justify-center">
            <span className="text-6xl">📸</span>
          </div>
        )}

        <h1 className="text-6xl font-bold tracking-tight text-brand-text">
          {branding.studioName}
        </h1>

        {branding.tagline && (
          <p className="text-brand-text/60 text-lg tracking-wide">{branding.tagline}</p>
        )}

        <p className="text-brand-text/50 text-xl tracking-widest uppercase">
          Tap layar untuk mulai
        </p>
      </div>

      <div className="absolute bottom-12 flex flex-col items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-brand-secondary animate-pulse" />
        <p className="text-brand-text/30 text-sm font-mono">Ready</p>
      </div>
    </div>
  )
}
