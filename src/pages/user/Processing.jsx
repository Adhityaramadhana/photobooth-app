import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'

const STEPS = [
  { key: 'composite', label: 'Menyusun foto ke frame...' },
  { key: 'gif', label: 'Membuat GIF & Boomerang...' },
  { key: 'upload', label: 'Mengupload ke cloud...' },
  { key: 'print', label: 'Mencetak foto...' },
]

export default function Processing() {
  const navigate = useNavigate()
  const {
    capturedPhotos,
    selectedFrame,
    currentSessionDir,
    liveFrameBuffer,
    setResultQrUrl,
    setResultQrImage,
    setProcessingStep,
  } = useAppStore()

  const [stepIndex, setStepIndex] = useState(-1)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    runProcessing()
  }, [])

  async function runProcessing() {
    try {
      const sessionDir = currentSessionDir
      const photos = capturedPhotos
      const frame = selectedFrame

      // ── Step 1: Composite ──────────────────────────────────────────────────
      setStepIndex(0)
      setProcessingStep(STEPS[0].label)

      let compositeFile = null
      if (frame && photos.length > 0) {
        const result = await window.electronAPI.composite.run({
          sessionDir,
          photos,
          frameId: frame.id,
          slots: frame.slots,
        })
        if (result.success) {
          compositeFile = result.filePath
        } else {
          console.warn('[Processing] Composite failed:', result.error)
        }
      }

      // ── Step 2: GIF & Boomerang ────────────────────────────────────────────
      setStepIndex(1)
      setProcessingStep(STEPS[1].label)

      let gifFile = null
      let boomerangFile = null

      const [gifResult, boomerangResult] = await Promise.all([
        window.electronAPI.gif.generate({ sessionDir, liveFrames: liveFrameBuffer }),
        window.electronAPI.gif.generateBoomerang({ sessionDir, liveFrames: liveFrameBuffer }),
      ])

      if (gifResult.success) gifFile = gifResult.filePath
      if (boomerangResult.success) boomerangFile = boomerangResult.filePath

      // ── Step 3: Upload ────────────────────────────────────────────────────
      setStepIndex(2)
      setProcessingStep(STEPS[2].label)

      const { settings } = await window.electronAPI.admin.getSettings()
      const studioName = settings?.branding?.studioName ?? 'Photobooth'

      const uploadResult = await window.electronAPI.upload.toCloud({
        sessionDir,
        compositeFile,
        rawPhotos: photos,
        gifFile,
        boomerangFile,
        studioName,
      })

      if (uploadResult.success) {
        setResultQrUrl(uploadResult.qrUrl)
        setResultQrImage(uploadResult.qrImageBase64)
      }

      // ── Step 4: Print ─────────────────────────────────────────────────────
      setStepIndex(3)
      setProcessingStep(STEPS[3].label)

      const printerName = settings?.printer?.name ?? ''
      const copies = settings?.printer?.copies ?? 1
      const printTarget = compositeFile ?? photos[0]

      if (printTarget) {
        await window.electronAPI.print.send({ filePath: printTarget, printerName, copies })
      }

      // ── Done ───────────────────────────────────────────────────────────────
      setDone(true)
      setProcessingStep(null)
      navigate('/result')
    } catch (err) {
      console.error('[Processing] Error:', err)
      setError(err.message ?? 'Terjadi kesalahan')
      setProcessingStep(null)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-8">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-2xl font-bold text-brand-text">Terjadi Kesalahan</h1>
        <p className="text-brand-text/50 text-sm text-center max-w-sm">{error}</p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => { setError(null); ran.current = false; runProcessing() }}
            className="px-6 py-3 bg-brand-secondary text-white rounded-xl font-semibold"
          >
            Coba Lagi
          </button>
          <button
            onClick={() => navigate('/result')}
            className="px-6 py-3 bg-brand-surface border border-white/10 text-brand-text rounded-xl font-semibold"
          >
            Lewati
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-10">
      <div className="w-20 h-20 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />

      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold text-brand-text">Memproses foto...</h1>

        <div className="flex flex-col gap-2 mt-2">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center gap-3">
              <span className={`text-lg ${
                i < stepIndex ? 'text-green-400' :
                i === stepIndex ? 'text-brand-secondary' :
                'text-brand-text/20'
              }`}>
                {i < stepIndex ? '✓' : i === stepIndex ? '●' : '○'}
              </span>
              <span className={`text-sm ${
                i < stepIndex ? 'text-green-400' :
                i === stepIndex ? 'text-brand-text' :
                'text-brand-text/30'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-brand-text/20 text-sm">Harap tunggu sebentar</p>
    </div>
  )
}
