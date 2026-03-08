import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'

export default function IdleScreen() {
  const navigate = useNavigate()
  const { setCameraStatus, setCameraModel, clearSession } = useAppStore()
  const [studioName, setStudioName] = useState('PHOTOBOOTH')

  // Reset sesi sebelumnya
  useEffect(() => {
    clearSession()
  }, [])

  useEffect(() => {
    window.electronAPI.admin.getSettings().then(({ settings }) => {
      const name = settings?.branding?.studioName
      if (name) setStudioName(name)
    }).catch(() => {})
  }, [])

  // Auto-connect kamera di background saat idle
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
        // silent — gagal connect di idle tidak perlu alert
      }
    }
    initCamera()
  }, [])

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen cursor-pointer select-none"
      onClick={() => navigate('/payment')}
    >
      {/* Branding */}
      <div className="flex flex-col items-center gap-6">
        <div className="w-32 h-32 rounded-full bg-brand-secondary flex items-center justify-center">
          <span className="text-6xl">📸</span>
        </div>

        <h1 className="text-6xl font-bold tracking-tight text-brand-text">
          {studioName}
        </h1>

        <p className="text-brand-text/50 text-xl tracking-widest uppercase">
          Tap layar untuk mulai
        </p>
      </div>

      {/* Pulse indicator */}
      <div className="absolute bottom-12 flex flex-col items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-brand-secondary animate-pulse" />
        <p className="text-brand-text/30 text-sm font-mono">Ready</p>
      </div>
    </div>
  )
}
