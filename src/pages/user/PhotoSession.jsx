import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'

const COUNTDOWN_SECONDS = 3
const FLASH_DURATION_MS = 600
const INTER_PHOTO_DELAY_MS = 1500
const LIVE_FRAME_INTERVAL_MS = 200  // rekam frame tiap 200ms untuk GIF

export default function PhotoSession() {
  const navigate = useNavigate()
  const {
    selectedFrame,
    currentSessionDir,
    setCurrentSessionDir,
    addCapturedPhoto,
    addLiveFrame,
    setLiveViewActive,
    setLiveViewFrameUrl,
    liveViewFrameUrl,
  } = useAppStore()

  const totalPhotos = selectedFrame?.slots?.length ?? 1

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [countdown, setCountdown] = useState(null)
  const [phase, setPhase] = useState('init')
  const [flash, setFlash] = useState(false)
  const [error, setError] = useState(null)

  const liveViewInterval = useRef(null)
  const sessionInitialized = useRef(false)
  const sessionDirRef = useRef(null)    // ref supaya startPhotoStep tidak stale

  // Webcam refs
  const webcamStreamRef = useRef(null)
  const webcamVideoRef = useRef(null)
  const webcamCanvasRef = useRef(null)
  const isWebcamRef = useRef(false)

  // Live frame recording refs
  const liveFrameIntervalRef = useRef(null)
  const liveFrameCounterRef = useRef(0)

  // ── Start live view (handle webcam + real + mock) ────────────────────────────
  const startLiveViewForStep = useCallback(async () => {
    const res = await window.electronAPI.camera.startLiveView()
    if (!res.success) throw new Error(res.error || 'startLiveView failed')
    setLiveViewActive(true)

    if (res.webcam) {
      // Webcam belum running? buka stream baru
      if (!webcamStreamRef.current) {
        const video = document.createElement('video')
        video.muted = true
        video.playsInline = true
        webcamVideoRef.current = video

        const canvas = document.createElement('canvas')
        webcamCanvasRef.current = canvas

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        })
        webcamStreamRef.current = stream
        video.srcObject = stream
        await video.play()
      }

      // Encode frame ke data URL tiap ~100ms → dipakai oleh live view img
      liveViewInterval.current = setInterval(() => {
        const video = webcamVideoRef.current
        const canvas = webcamCanvasRef.current
        if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
        setLiveViewFrameUrl(canvas.toDataURL('image/jpeg', 0.75))
      }, 100)

    } else if (res.mock) {
      // Picsum statis — set sekali
      setLiveViewFrameUrl(res.framePath)
    } else {
      // Kamera real — polling liveview.jpg
      liveViewInterval.current = setInterval(() => {
        setLiveViewFrameUrl(`${res.framePath}?t=${Date.now()}`)
      }, 100)
    }
  }, [])

  const stopLiveViewForStep = useCallback(async () => {
    if (liveViewInterval.current) {
      clearInterval(liveViewInterval.current)
      liveViewInterval.current = null
    }
    await window.electronAPI.camera.stopLiveView()
    setLiveViewActive(false)
  }, [])

  // ── Init session ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionInitialized.current) return
    sessionInitialized.current = true

    // Cek apakah webcam mode
    window.electronAPI.camera.startLiveView().then(res => {
      isWebcamRef.current = !!res.webcam
      // Stop lagi — nanti dibuka ulang di startPhotoStep
      window.electronAPI.camera.stopLiveView().catch(() => {})
    })

    const init = async () => {
      try {
        const dir = await window.electronAPI.app.getSessionDir()
        setCurrentSessionDir(dir)
        sessionDirRef.current = dir
        await startPhotoStep(0, dir)
      } catch (e) {
        setError('Gagal inisialisasi sesi: ' + e.message)
      }
    }
    init()

    return () => {
      if (liveViewInterval.current) clearInterval(liveViewInterval.current)
      if (liveFrameIntervalRef.current) clearInterval(liveFrameIntervalRef.current)
      // Stop webcam stream saat unmount
      webcamStreamRef.current?.getTracks().forEach(t => t.stop())
      webcamStreamRef.current = null
      window.electronAPI.camera.stopLiveView().catch(() => {})
      setLiveViewActive(false)
    }
  }, [])

  // ── Live frame recording helpers ──────────────────────────────────────────────
  const startFrameRecording = (dir, photoIndex) => {
    liveFrameCounterRef.current = 0
    liveFrameIntervalRef.current = setInterval(() => {
      // Ambil frame dari webcam canvas atau liveViewFrameUrl
      let dataUrl = null

      const video = webcamVideoRef.current
      const canvas = webcamCanvasRef.current
      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
        // Webcam: render frame dari video element (mirror horizontal supaya hasil = preview)
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.save()
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(video, 0, 0)
        ctx.restore()
        dataUrl = canvas.toDataURL('image/jpeg', 0.6)
      }

      if (!dataUrl) return

      const frameIdx = liveFrameCounterRef.current++
      // Fire-and-forget: simpan ke disk tanpa blocking
      window.electronAPI.camera.saveLiveFrame(dir, dataUrl, photoIndex, frameIdx)
        .then(res => {
          if (res.success) addLiveFrame(res.filePath)
        })
        .catch(() => {}) // ignore errors, jangan ganggu countdown
    }, LIVE_FRAME_INTERVAL_MS)
  }

  const stopFrameRecording = () => {
    if (liveFrameIntervalRef.current) {
      clearInterval(liveFrameIntervalRef.current)
      liveFrameIntervalRef.current = null
    }
  }

  // ── Foto step ─────────────────────────────────────────────────────────────────
  const startPhotoStep = async (photoIndex, sessionDir) => {
    const dir = sessionDir ?? sessionDirRef.current
    setCurrentPhotoIndex(photoIndex)
    setPhase('liveview')

    try {
      await startLiveViewForStep()
    } catch {
      setError('Gagal memulai live view')
      return
    }

    // Countdown 3-2-1 + rekam frames untuk GIF
    setPhase('countdown')
    startFrameRecording(dir, photoIndex)
    for (let i = COUNTDOWN_SECONDS; i >= 1; i--) {
      setCountdown(i)
      await sleep(1000)
    }
    setCountdown(null)
    stopFrameRecording()

    // Flash + capture
    setPhase('flash')
    setFlash(true)
    await stopLiveViewForStep()

    let filePath = null
    try {
      let result

      if (isWebcamRef.current) {
        // ── Webcam capture: snapshot canvas → base64 → simpan via IPC ──
        const video = webcamVideoRef.current
        const canvas = webcamCanvasRef.current
        if (!video || !canvas) throw new Error('Webcam not ready')

        const snapCanvas = document.createElement('canvas')
        snapCanvas.width = video.videoWidth
        snapCanvas.height = video.videoHeight
        const snapCtx = snapCanvas.getContext('2d')
        snapCtx.translate(snapCanvas.width, 0)
        snapCtx.scale(-1, 1)
        snapCtx.drawImage(video, 0, 0)
        const base64 = snapCanvas.toDataURL('image/jpeg', 0.95)

        result = await window.electronAPI.camera.saveWebcamFrame(dir, base64)
      } else {
        // ── Mock / real camera capture ──
        result = await window.electronAPI.camera.capture(dir)
      }

      if (result.success) {
        filePath = result.filePath
        addCapturedPhoto(filePath)
      } else {
        setError('Capture gagal: ' + (result.error || ''))
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
      await startPhotoStep(nextIndex, dir)
    } else {
      // Matikan webcam stream setelah semua foto selesai
      webcamStreamRef.current?.getTracks().forEach(t => t.stop())
      webcamStreamRef.current = null
      setPhase('done')
      await sleep(800)
      navigate('/processing')
    }
  }

  // ── Error screen ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6">
        <p className="text-red-400 text-xl">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-brand-secondary text-brand-secondary-text rounded-xl"
        >
          Kembali ke Awal
        </button>
      </div>
    )
  }

  // ── Main UI ───────────────────────────────────────────────────────────────────
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
          style={{ transform: 'scaleX(-1)' }}
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
