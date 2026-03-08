import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'

const COUNTDOWN_SECONDS = 3
const FLASH_DURATION_MS = 600
const INTER_PHOTO_DELAY_MS = 1500

export default function PhotoSession() {
  const navigate = useNavigate()
  const {
    selectedFrame,
    setCurrentSessionDir,
    addCapturedPhoto,
    setLiveViewActive,
    setLiveViewFrameUrl,
    liveViewFrameUrl,
  } = useAppStore()

  const totalPhotos = selectedFrame?.slots?.length ?? 1

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)  // foto ke-berapa (0-based)
  const [countdown, setCountdown] = useState(null)                // null = tidak countdown
  const [phase, setPhase] = useState('init')                      // init | liveview | countdown | flash | done
  const [flash, setFlash] = useState(false)
  const [error, setError] = useState(null)

  const liveViewInterval = useRef(null)
  const sessionInitialized = useRef(false)

  // Poll live view frames
  const startLiveViewPolling = useCallback(() => {
    liveViewInterval.current = setInterval(async () => {
      try {
        const url = `http://localhost:5513/liveview.jpg?t=${Date.now()}`
        setLiveViewFrameUrl(url)
      } catch {
        // ignore poll errors
      }
    }, 100)
  }, [])

  const stopLiveViewPolling = useCallback(() => {
    if (liveViewInterval.current) {
      clearInterval(liveViewInterval.current)
      liveViewInterval.current = null
    }
  }, [])

  // Init session dan mulai foto pertama
  useEffect(() => {
    if (sessionInitialized.current) return
    sessionInitialized.current = true

    const init = async () => {
      try {
        const dir = await window.electronAPI.app.getSessionDir()
        setCurrentSessionDir(dir)
        await startPhotoStep(0)
      } catch (e) {
        setError('Gagal inisialisasi sesi: ' + e.message)
      }
    }
    init()

    return () => {
      stopLiveViewPolling()
      window.electronAPI.camera.stopLiveView().catch(() => {})
      setLiveViewActive(false)
    }
  }, [])

  const startPhotoStep = async (photoIndex) => {
    setCurrentPhotoIndex(photoIndex)
    setPhase('liveview')

    // Start live view
    try {
      await window.electronAPI.camera.startLiveView()
      setLiveViewActive(true)
      startLiveViewPolling()
    } catch {
      setError('Gagal memulai live view')
      return
    }

    // Countdown
    setPhase('countdown')
    for (let i = COUNTDOWN_SECONDS; i >= 1; i--) {
      setCountdown(i)
      await sleep(1000)
    }
    setCountdown(null)

    // Capture
    setPhase('flash')
    setFlash(true)
    stopLiveViewPolling()
    await window.electronAPI.camera.stopLiveView()
    setLiveViewActive(false)

    let filePath = null
    try {
      const result = await window.electronAPI.camera.capture()
      if (result.success) {
        filePath = result.filePath
        addCapturedPhoto(filePath)
      } else {
        setError('Capture gagal')
        return
      }
    } catch (e) {
      setError('Error saat capture: ' + e.message)
      return
    }

    await sleep(FLASH_DURATION_MS)
    setFlash(false)

    const nextIndex = photoIndex + 1
    if (nextIndex < totalPhotos) {
      await sleep(INTER_PHOTO_DELAY_MS)
      await startPhotoStep(nextIndex)
    } else {
      setPhase('done')
      await sleep(800)
      navigate('/processing')
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6">
        <p className="text-red-400 text-xl">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-brand-secondary text-white rounded-xl"
        >
          Kembali ke Awal
        </button>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden">
      {/* Flash overlay */}
      {flash && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none" />
      )}

      {/* Live view */}
      {liveViewFrameUrl && phase !== 'done' ? (
        <img
          src={liveViewFrameUrl}
          alt="Live View"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // mirror seperti kamera selfie
        />
      ) : (
        <div className="absolute inset-0 bg-brand-primary" />
      )}

      {/* Overlay gelap supaya teks terbaca */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Countdown */}
      {phase === 'countdown' && countdown !== null && (
        <div className="relative z-10 flex flex-col items-center gap-4">
          <span className="text-[180px] font-black text-white leading-none drop-shadow-lg">
            {countdown}
          </span>
        </div>
      )}

      {/* Status bawah */}
      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2 z-10">
        <div className="flex gap-2">
          {Array.from({ length: totalPhotos }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i < currentPhotoIndex
                  ? 'bg-brand-secondary'
                  : i === currentPhotoIndex
                  ? 'bg-white'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>
        <p className="text-white/70 text-sm font-mono">
          Foto {currentPhotoIndex + 1} dari {totalPhotos}
        </p>
      </div>
    </div>
  )
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
