import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'

const AUTO_RETURN_SECONDS = 60

export default function Result() {
  const navigate = useNavigate()
  const { resultCompositeFile, capturedPhotos, resultQrUrl, resultQrImage, clearSession } = useAppStore()
  const [secondsLeft, setSecondsLeft] = useState(AUTO_RETURN_SECONDS)
  const [compositeDataUrl, setCompositeDataUrl] = useState(null)
  const [photoDataUrls, setPhotoDataUrls] = useState([])
  const timerRef = useRef(null)

  const handleFinish = () => {
    clearSession()
    navigate('/idle')
  }

  // Auto-return countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          handleFinish()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Load composite image as data URL via IPC (file:// blocked in dev mode)
  useEffect(() => {
    if (resultCompositeFile) {
      window.electronAPI.app.readFileAsDataUrl(resultCompositeFile).then(url => {
        if (url) setCompositeDataUrl(url)
      })
    } else if (capturedPhotos.length > 0) {
      // Fallback: load raw photos
      Promise.all(
        capturedPhotos.map(p => window.electronAPI.app.readFileAsDataUrl(p))
      ).then(urls => setPhotoDataUrls(urls.filter(Boolean)))
    }
  }, [resultCompositeFile, capturedPhotos])

  const hasMockQr = !resultQrUrl || resultQrUrl === 'mock'

  return (
    <div className="flex h-screen gap-8 px-8 py-10 overflow-hidden">

      {/* Kiri: preview foto */}
      <div className="flex flex-col gap-6 flex-1 min-w-0 min-h-0">
        <h1 className="text-3xl font-bold text-brand-text tracking-tight">
          Foto Selesai! 🎉
        </h1>

        {compositeDataUrl ? (
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <img
              src={compositeDataUrl}
              alt="Hasil foto"
              className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
            />
          </div>
        ) : photoDataUrls.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 flex-1">
            {photoDataUrls.map((dataUrl, i) => (
              <div
                key={i}
                className="aspect-[4/3] bg-brand-surface rounded-xl overflow-hidden"
              >
                <img
                  src={dataUrl}
                  alt={`Foto ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 bg-brand-surface rounded-2xl flex items-center justify-center">
            <p className="text-brand-text/30">Memproses...</p>
          </div>
        )}
      </div>

      {/* Kanan: QR code + tombol selesai — grouped at bottom */}
      <div className="flex flex-col justify-end items-center gap-5 w-80 flex-shrink-0 py-4">
        <p className="text-brand-text/60 text-sm text-center">
          Scan QR untuk download foto di HP kamu
        </p>

        {hasMockQr ? (
          <div className="w-64 h-64 bg-brand-surface border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 p-4">
            <span className="text-3xl">⚙️</span>
            <p className="text-brand-text/40 text-xs text-center">
              QR belum dikonfigurasi. Atur Firebase di Admin → Branding.
            </p>
          </div>
        ) : (
          <div className="w-64 h-64 bg-white rounded-2xl p-2 overflow-hidden">
            <img
              src={resultQrImage}
              alt="QR Code"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        <button
          onClick={handleFinish}
          className="w-full py-4 bg-brand-secondary text-white rounded-2xl text-lg font-semibold active:scale-95 transition"
        >
          Selesai
        </button>
        <p className="text-brand-text/20 text-sm font-mono">
          Kembali otomatis dalam {secondsLeft}s
        </p>
      </div>

    </div>
  )
}
