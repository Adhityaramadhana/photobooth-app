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
      if (data) setFramePngs(prev => ({ ...prev, [f.id]: data }))
    })
  }, [frames])

  // Start camera live view
  useEffect(() => {
    let mounted = true
    const start = async () => {
      try {
        const res = await window.electronAPI.camera.startLiveView()
        if (!mounted || !res.success) return
        if (res.mock) {
          setLiveViewUrl(res.framePath)
        } else {
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
      window.electronAPI.camera.stopLiveView().catch(() => {})
    }
  }, [])

  const handleConfirm = () => {
    if (!activeFrame) return
    setSelectedFrame(activeFrame)
    if (liveViewInterval.current) {
      clearInterval(liveViewInterval.current)
      liveViewInterval.current = null
    }
    window.electronAPI.camera.stopLiveView().catch(() => {})
    navigate('/photo-session')
  }

  const scrollCarousel = (dir) => {
    const el = carouselRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: 'smooth' })
  }

  const previewPng = activeFrame ? framePngs[activeFrame.id] : null

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
      <div className="flex-1 min-h-0 flex items-center justify-center px-12 pb-4">
        {activeFrame && previewPng ? (
          <FramePreview
            framePng={previewPng}
            slots={activeFrame.slots}
            liveViewUrl={liveViewUrl}
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
                <div className="aspect-[3/4] bg-black/40">
                  {framePngs[frame.id] ? (
                    <img
                      src={framePngs[frame.id]}
                      alt={frame.name}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  ) : (
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

/**
 * Large preview: frame PNG overlay + live camera feed clipped to each slot.
 */
function FramePreview({ framePng, slots, liveViewUrl }) {
  const containerRef = useRef(null)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const img = new Image()
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = framePng
  }, [framePng])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      setContainerSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const ready = imgSize.w > 0 && containerSize.w > 0 && containerSize.h > 0
  const scale = ready
    ? Math.min(containerSize.w / imgSize.w, containerSize.h / imgSize.h)
    : 1
  const displayW = ready ? imgSize.w * scale : 0
  const displayH = ready ? imgSize.h * scale : 0

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      {ready && (
        <div
          className="relative rounded-xl overflow-hidden shadow-2xl"
          style={{ width: displayW, height: displayH }}
        >
          {/* Camera feed clipped to each slot */}
          {slots.map((slot, i) => (
            <div
              key={i}
              className="absolute overflow-hidden bg-black"
              style={{
                left: slot.x * scale,
                top: slot.y * scale,
                width: slot.width * scale,
                height: slot.height * scale,
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
          ))}

          {/* Frame PNG overlay */}
          <img
            src={framePng}
            alt="Frame"
            className="absolute inset-0 w-full h-full pointer-events-none"
            draggable={false}
          />
        </div>
      )}
    </div>
  )
}
