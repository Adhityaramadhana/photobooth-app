import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'

const AUTO_RETURN_SECONDS = 60

export default function Result() {
  const navigate = useNavigate()
  const { capturedPhotos, resultQrUrl, resultQrImage, clearSession } = useAppStore()
  const [secondsLeft, setSecondsLeft] = useState(AUTO_RETURN_SECONDS)

  const handleFinish = () => {
    clearSession()
    navigate('/')
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval)
          handleFinish()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const hasMockQr = !resultQrUrl || resultQrUrl === 'mock'

  return (
    <div className="flex min-h-screen gap-8 px-8 py-10">

      {/* Kiri: preview foto */}
      <div className="flex flex-col gap-6 flex-1 min-w-0">
        <h1 className="text-3xl font-bold text-brand-text tracking-tight">
          Foto Selesai! 🎉
        </h1>

        {capturedPhotos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 flex-1">
            {capturedPhotos.map((photoPath, i) => (
              <div
                key={i}
                className="aspect-[4/3] bg-brand-surface rounded-xl overflow-hidden"
              >
                <img
                  src={`file://${photoPath}`}
                  alt={`Foto ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 bg-brand-surface rounded-2xl flex items-center justify-center">
            <p className="text-brand-text/30">Tidak ada foto</p>
          </div>
        )}
      </div>

      {/* Kanan: QR code + tombol selesai */}
      <div className="flex flex-col items-center justify-between w-72 flex-shrink-0 py-4">
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-brand-text/60 text-sm text-center">
            Scan QR untuk download foto di HP kamu
          </p>

          {hasMockQr ? (
            <div className="w-52 h-52 bg-brand-surface border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 p-4">
              <span className="text-2xl">⚙️</span>
              <p className="text-brand-text/40 text-xs text-center">
                QR belum dikonfigurasi. Atur Firebase di Admin → Branding.
              </p>
            </div>
          ) : (
            <div className="w-52 h-52 bg-white rounded-2xl p-2 overflow-hidden">
              <img
                src={resultQrImage}
                alt="QR Code"
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 w-full">
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

    </div>
  )
}
