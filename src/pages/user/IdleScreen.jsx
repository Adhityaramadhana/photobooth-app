import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'
import SplitLayout from '../../components/SplitLayout'

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

  // In split mode, the right side uses flex-1 to fill the remaining height.
  // In centered mode, it uses min-h-screen to fill the whole screen.
  const isSplit = branding.layoutTemplate === 'split'
  const contentHeight = isSplit ? 'flex-1' : 'min-h-screen'

  return (
    <SplitLayout title="Welcome" subtitle="Mari buat kenangan indah hari ini">
      <div
        className={`flex flex-col items-center justify-center ${contentHeight} cursor-pointer select-none relative`}
        onClick={() => navigate('/payment')}
      >
        <div className="flex flex-col items-center gap-6">
          {/* Logo only shown large in center if NOT split */}
          {!isSplit && (
            branding.logoDataUrl ? (
              <img src={branding.logoDataUrl} alt="Logo" className="h-32 w-auto object-contain" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-brand-secondary flex items-center justify-center">
                <span className="text-6xl">📸</span>
              </div>
            )
          )}

          <h1 className={`${isSplit ? 'text-7xl' : 'text-6xl'} font-bold tracking-tight text-brand-text text-center`}>
            {branding.studioName}
          </h1>

          {branding.tagline && (
            <p className="text-brand-text/60 text-lg tracking-wide text-center uppercase">{branding.tagline}</p>
          )}

          <div className="mt-8 flex flex-col items-center gap-4">
            <p className="px-8 py-4 bg-brand-secondary text-brand-secondary-text rounded-full text-xl font-bold tracking-widest shadow-lg shadow-brand-secondary/20">
              TAP LAYAR UNTUK MULAI
            </p>
          </div>
        </div>

        <div className={`absolute ${isSplit ? 'bottom-8' : 'bottom-12'} flex items-center gap-3`}>
          <div className="w-3 h-3 rounded-full bg-brand-secondary animate-pulse" />
          <p className="text-brand-text/30 text-sm font-mono uppercase tracking-widest">Ready</p>
        </div>
      </div>
    </SplitLayout>
  )
}
