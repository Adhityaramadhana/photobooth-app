import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'

export default function SelectFrame() {
  const navigate = useNavigate()
  const setSelectedFrame = useAppStore(s => s.setSelectedFrame)

  const [frames, setFrames] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFrame, setActiveFrame] = useState(null)
  const [framePngs, setFramePngs] = useState({})
  const [liveViewUrl, setLiveViewUrl] = useState(null)

  const liveViewInterval = useRef(null)
  const webcamStreamRef = useRef(null)   // webcam MediaStream
  const webcamVideoRef = useRef(null)    // hidden <video> element
  const webcamCanvasRef = useRef(null)   // offscreen canvas untuk toDataURL
  const requestedPngs = useRef(new Set())
  const carouselRef = useRef(null)

  // Load frame list
  useEffect(() => {
    window.electronAPI.frame.getList().then(({ frames: list }) => {
      const valid = (list ?? []).filter(f => f.slots?.length > 0)
      setFrames(valid)
      setLoading(false)
      if (valid.length > 0) setActiveFrame(valid[0])
    }).catch(() => setLoading(false))
  }, [])

  // Load all frame PNGs
  useEffect(() => {
    frames.forEach(async (f) => {
      if (requestedPngs.current.has(f.id)) return
      requestedPngs.current.add(f.id)
      const { data } = await window.electronAPI.frame.getPng(f.id)
      // Store data URL on success, or false to stop spinner when no PNG exists
      setFramePngs(prev => ({ ...prev, [f.id]: data || false }))
    })
  }, [frames])

  // Start camera live view
  useEffect(() => {
    let mounted = true
    const start = async () => {
      try {
        const res = await window.electronAPI.camera.startLiveView()
        if (!mounted || !res.success) return

        if (res.webcam) {
          // ── Webcam mode: getUserMedia → canvas → data URL @ ~10fps ──
          const video = document.createElement('video')
          video.muted = true
          video.playsInline = true
          webcamVideoRef.current = video

          const canvas = document.createElement('canvas')
          webcamCanvasRef.current = canvas

          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
              audio: false,
            })
            if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }
            webcamStreamRef.current = stream
            video.srcObject = stream
            await video.play()

            // Encode frame ke data URL tiap ~100ms, feed ke slot rendering yang sudah ada
            liveViewInterval.current = setInterval(() => {
              if (video.readyState < 2 || video.videoWidth === 0) return
              canvas.width = video.videoWidth
              canvas.height = video.videoHeight
              canvas.getContext('2d').drawImage(video, 0, 0)
              setLiveViewUrl(canvas.toDataURL('image/jpeg', 0.75))
            }, 100)
          } catch (err) {
            console.error('[WEBCAM] getUserMedia failed:', err)
          }

        } else if (res.mock) {
          // Picsum statis
          setLiveViewUrl(res.framePath)
        } else {
          // Kamera real — polling liveview.jpg
          liveViewInterval.current = setInterval(() => {
            setLiveViewUrl(`${res.framePath}?t=${Date.now()}`)
          }, 100)
        }
      } catch {}
    }
    start()
    return () => {
      mounted = false
      if (liveViewInterval.current) clearInterval(liveViewInterval.current)
      webcamStreamRef.current?.getTracks().forEach(t => t.stop())
      webcamStreamRef.current = null
      window.electronAPI.camera.stopLiveView().catch(() => {})
    }
  }, [])

  const handleConfirm = () => {
    if (!activeFrame) return
    setSelectedFrame(activeFrame)
    // Stop polling / webcam stream sebelum pindah ke PhotoSession
    if (liveViewInterval.current) {
      clearInterval(liveViewInterval.current)
      liveViewInterval.current = null
    }
    webcamStreamRef.current?.getTracks().forEach(t => t.stop())
    webcamStreamRef.current = null
    window.electronAPI.camera.stopLiveView().catch(() => {})
    navigate('/photo-session')
  }

  const scrollCarousel = (dir) => {
    const el = carouselRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: 'smooth' })
  }

  const previewPng = activeFrame ? framePngs[activeFrame.id] : null
  // For v2 templates without a frame.png yet, use the stored canvas dimensions
  const previewCanvasW = activeFrame?.canvasWidth  ?? null
  const previewCanvasH = activeFrame?.canvasHeight ?? null
  // Show preview whenever we have a frame selected with slots
  const canShowPreview = activeFrame && activeFrame.slots?.length > 0 && (previewPng || previewCanvasW)

  return (
    <div className="flex flex-col h-screen bg-brand-primary">
      {/* Top bar: Next button */}
      <div className="flex items-center justify-end px-8 pt-4 pb-2">
        <button
          onClick={handleConfirm}
          disabled={!activeFrame}
          className="px-8 py-3 bg-blue-500 text-white font-bold rounded-full text-lg active:scale-95 transition disabled:opacity-30"
        >
          Next
        </button>
      </div>

      {/* Center: Large live preview */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-12 py-4">
        {canShowPreview ? (
          <FramePreview
            framePng={previewPng}
            slots={activeFrame.slots}
            liveViewUrl={liveViewUrl}
            canvasWidth={previewCanvasW}
            canvasHeight={previewCanvasH}
          />
        ) : (
          <div className="text-brand-text/20 text-xl">
            {loading ? 'Memuat...' : 'Pilih template di bawah'}
          </div>
        )}
      </div>

      {/* Bottom: Horizontal template carousel */}
      <div className="flex-shrink-0 pb-6">
        <p className="text-center text-brand-text/50 text-sm mb-3">Choose a template</p>

        <div className="relative flex items-center px-2">
          {/* Left arrow */}
          <button
            onClick={() => scrollCarousel(-1)}
            className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-brand-text/40 hover:text-brand-text text-3xl transition"
          >
            ‹
          </button>

          {/* Scrollable row */}
          <div
            ref={carouselRef}
            className="flex-1 flex gap-3 overflow-x-auto px-2 py-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {loading && (
              <div className="flex-1 flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {frames.map((frame) => (
              <button
                key={frame.id}
                onClick={() => setActiveFrame(frame)}
                className={`flex-shrink-0 w-36 rounded-lg overflow-hidden border-[3px] transition active:scale-95 ${
                  activeFrame?.id === frame.id
                    ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                    : 'border-transparent hover:border-white/20'
                }`}
              >
                <div className="bg-black/40" style={{ aspectRatio: frame.canvasWidth && frame.canvasHeight ? `${frame.canvasWidth}/${frame.canvasHeight}` : '3/4' }}>
                  {framePngs[frame.id] ? (
                    // Has PNG — show it
                    <img
                      src={framePngs[frame.id]}
                      alt={frame.name}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  ) : framePngs[frame.id] === false ? (
                    // Fetch done but no PNG — show slot count placeholder
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <span className="text-brand-text/30 text-2xl">🖼</span>
                      <span className="text-brand-text/25 text-[10px]">{frame.slots?.length} slot{frame.slots?.length !== 1 ? 's' : ''}</span>
                    </div>
                  ) : (
                    // Still loading
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-brand-secondary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Right arrow */}
          <button
            onClick={() => scrollCarousel(1)}
            className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-brand-text/40 hover:text-brand-text text-3xl transition"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}

// Breathing room on every side — mirrors the 40px padding used in EditorCanvas
const PREVIEW_PAD = 24

/**
 * Large preview: frame PNG overlay + live camera feed clipped to each slot.
 *
 * Scale is computed exactly like EditorCanvas:
 *   scale = min((clientWidth - pad*2) / coordW, (clientHeight - pad*2) / coordH)
 *
 * Coordinate reference:
 *  - v2 templates: canvasWidth / canvasHeight (always available)
 *  - v1 templates: PNG natural dimensions (loaded on demand)
 *
 * Slot positions are clamped to canvas bounds so an out-of-bounds design
 * never causes an oversized div that makes the camera feed appear everywhere.
 */
function FramePreview({ framePng, slots, liveViewUrl, canvasWidth, canvasHeight }) {
  const containerRef = useRef(null)
  // For v1 frames only: PNG natural dimensions (v2 always uses canvasWidth/canvasHeight)
  const [pngDims, setPngDims] = useState(null)
  const [scale, setScale]     = useState(0)

  // Load PNG dims only when we don't already have explicit canvas dimensions (v1 frames)
  useEffect(() => {
    if (canvasWidth || !framePng) { setPngDims(null); return }
    const img = new Image()
    img.onload  = () => setPngDims({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => setPngDims(null)
    img.src = framePng
  }, [framePng, canvasWidth])

  // Canonical coordinate space (canvas units that slot x/y/width/height are in)
  const coordW = canvasWidth  || pngDims?.w || 0
  const coordH = canvasHeight || pngDims?.h || 0

  // Re-compute scale whenever container size or coordinate space changes
  // Uses clientWidth/clientHeight (same as EditorCanvas) — more reliable than
  // ResizeObserver contentRect on a h-full child of a flex items-center parent.
  useEffect(() => {
    const el = containerRef.current
    if (!el || !coordW || !coordH) return

    const compute = () => {
      const availW = el.clientWidth  - PREVIEW_PAD * 2
      const availH = el.clientHeight - PREVIEW_PAD * 2
      if (availW <= 0 || availH <= 0) { setScale(0); return }
      setScale(Math.min(availW / coordW, availH / coordH))
    }

    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [coordW, coordH])

  const displayW = scale > 0 ? coordW * scale : 0
  const displayH = scale > 0 ? coordH * scale : 0

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      {scale > 0 && (
        <div
          className="relative rounded-xl overflow-hidden shadow-2xl"
          style={{ width: displayW, height: displayH, background: '#111' }}
        >
          {/* Camera feed clipped to each slot — clamped to canvas bounds */}
          {slots.map((slot, i) => {
            const sl = Math.max(0, slot.x)
            const st = Math.max(0, slot.y)
            const sw = Math.min(slot.width,  coordW - sl)
            const sh = Math.min(slot.height, coordH - st)
            if (sw <= 0 || sh <= 0) return null
            return (
              <div
                key={i}
                className="absolute overflow-hidden"
                style={{
                  left:   sl * scale,
                  top:    st * scale,
                  width:  sw * scale,
                  height: sh * scale,
                  background: '#000',
                }}
              >
                {liveViewUrl ? (
                  <img
                    src={liveViewUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full bg-brand-surface flex items-center justify-center">
                    <span className="text-brand-text/20 text-2xl">📷</span>
                  </div>
                )}
              </div>
            )
          })}

          {/* Frame PNG overlay — transparent areas reveal camera slots below */}
          {framePng && (
            <img
              src={framePng}
              alt="Frame"
              className="absolute inset-0 w-full h-full pointer-events-none"
              draggable={false}
            />
          )}

          {/* No-PNG badge — only when fetch confirmed no file exists (false sentinel) */}
          {framePng === false && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
              <span className="text-xs text-white/40 bg-black/40 rounded px-2 py-0.5">
                {slots.length} slot{slots.length !== 1 ? 's' : ''} · re-save in editor to generate preview
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
