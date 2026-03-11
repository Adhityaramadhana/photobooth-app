import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Canvas } from 'fabric'

// Preset snap levels for zoom in/out (10% → 200%)
const ZOOM_SNAPS = [0.10, 0.25, 0.33, 0.50, 0.67, 0.75, 1.00, 1.25, 1.50, 2.00]
function snapZoomUp(current)   { return ZOOM_SNAPS.find(s => s > current + 0.02)                     ?? 2.00 }
function snapZoomDown(current) { return [...ZOOM_SNAPS].reverse().find(s => s < current - 0.02) ?? 0.10 }

const EditorCanvas = forwardRef(function EditorCanvas(
  { canvasWidth, canvasHeight, onSelectionChange, onLayersChange, onZoomChange },
  ref
) {
  const canvasElRef  = useRef(null)
  const fabricRef    = useRef(null)
  const wrapperRef   = useRef(null)
  const zoomRef      = useRef({ userScale: null, fitScale: 1 }) // userScale null = auto-fit

  // Stable callback refs (avoid stale closures in canvas events)
  const onLayersChangeRef    = useRef(onLayersChange)
  const onSelectionChangeRef = useRef(onSelectionChange)
  const onZoomChangeRef      = useRef(onZoomChange)
  onLayersChangeRef.current    = onLayersChange
  onSelectionChangeRef.current = onSelectionChange
  onZoomChangeRef.current      = onZoomChange

  // Stable dimension key — only recreate canvas when paper size actually changes
  const dimKey = `${canvasWidth}x${canvasHeight}`

  // ── Public API exposed to TemplateEditor ──────────────────────────────────
  useImperativeHandle(ref, () => ({
    getCanvas: () => fabricRef.current,
    dispose: () => {
      if (fabricRef.current) {
        fabricRef.current.dispose()
        fabricRef.current = null
      }
    },
    zoomIn:  () => applyUserZoom(snapZoomUp(zoomRef.current.userScale  ?? zoomRef.current.fitScale)),
    zoomOut: () => applyUserZoom(snapZoomDown(zoomRef.current.userScale ?? zoomRef.current.fitScale)),
    zoomFit: () => { zoomRef.current.userScale = null; applyZoom(fabricRef.current) },
  }))

  // ── Helpers ───────────────────────────────────────────────────────────────

  function syncLayers() {
    const canvas = fabricRef.current
    if (!canvas) return
    const objects = canvas.getObjects()
    const layers = objects.map(obj => ({
      id:        obj.id,
      name:      obj.name || 'Unnamed',
      layerRole: obj.layerRole || obj.type,
      visible:   obj.visible !== false,
      locked:    obj.locked || false,
      type:      obj.type,
    }))
    onLayersChangeRef.current?.(layers)
  }

  function applyUserZoom(scale) {
    zoomRef.current.userScale = Math.max(0.10, Math.min(2.00, scale))
    applyZoom(fabricRef.current)
  }

  function applyZoom(canvas) {
    const wrapper = wrapperRef.current
    if (!wrapper || !canvas) return
    const padding = 40
    const maxW = wrapper.clientWidth  - padding
    const maxH = wrapper.clientHeight - padding
    if (maxW <= 0 || maxH <= 0) return

    // Always recalculate fit scale (container may have resized)
    const fitScale = Math.min(maxW / canvas.width, maxH / canvas.height, 1)
    zoomRef.current.fitScale = fitScale

    const scale = zoomRef.current.userScale ?? fitScale

    // Keep fabric's internal coordinate system at 1:1 (real pixel units).
    // Only the CSS size changes — avoids double-scaling on window resize.
    canvas.setDimensions(
      { width: canvas.width * scale, height: canvas.height * scale },
      { cssOnly: true }
    )
    canvas.renderAll()

    const label = zoomRef.current.userScale === null
      ? 'Fit'
      : `${Math.round(zoomRef.current.userScale * 100)}%`
    onZoomChangeRef.current?.(label)
  }

  // ── Init fabric canvas (recreated when paper size changes) ────────────────
  useEffect(() => {
    if (!canvasElRef.current || !canvasWidth || !canvasHeight) return

    if (fabricRef.current) {
      fabricRef.current.dispose()
      fabricRef.current = null
    }

    // Reset user zoom whenever canvas dimensions change
    zoomRef.current.userScale = null

    const canvas = new Canvas(canvasElRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    })
    fabricRef.current = canvas

    // Selection events
    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0]
      onSelectionChangeRef.current?.(obj?.id ?? null, obj ?? null)
    })
    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0]
      onSelectionChangeRef.current?.(obj?.id ?? null, obj ?? null)
    })
    canvas.on('selection:cleared', () => {
      onSelectionChangeRef.current?.(null, null)
    })

    // Layer sync events
    canvas.on('object:modified', syncLayers)
    canvas.on('object:added',    syncLayers)
    canvas.on('object:removed',  syncLayers)

    // Draw slot-index numbers on photo-slot rects
    canvas.on('after:render', () => {
      const ctx = canvas.getContext()
      if (!ctx) return
      canvas.getObjects().forEach(obj => {
        if (obj.layerRole === 'photo-slot' && obj.visible !== false) {
          const center    = obj.getCenterPoint()
          const cx        = center.x
          const cy        = center.y
          const label     = String((obj.slotIndex ?? 0) + 1)
          const fontSize  = 52

          ctx.save()
          ctx.font         = `bold ${fontSize}px Arial`
          ctx.textAlign    = 'center'
          ctx.textBaseline = 'middle'

          const metrics = ctx.measureText(label)
          const padX = fontSize * 0.55
          const padY = fontSize * 0.35
          const bw   = metrics.width + padX * 2
          const bh   = fontSize + padY * 2
          const br   = bh / 2

          ctx.beginPath()
          ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, br)
          ctx.fillStyle = 'rgba(233, 69, 96, 0.88)'
          ctx.fill()

          ctx.fillStyle = '#ffffff'
          ctx.fillText(label, cx, cy)
          ctx.restore()
        }
      })
    })

    applyZoom(canvas)

    return () => {
      canvas.dispose()
      fabricRef.current = null
    }
  }, [dimKey])

  // ── Responsive zoom on container resize ───────────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const canvas = fabricRef.current
      if (!canvas) return
      applyZoom(canvas)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [dimKey])

  // ── Ctrl+Wheel zoom + Touch pinch ─────────────────────────────────────────
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    // ── Ctrl+Wheel (also fires for trackpad 2-finger pinch) ──
    const onWheel = (e) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const current = zoomRef.current.userScale ?? zoomRef.current.fitScale
      if (e.deltaY < 0) applyUserZoom(snapZoomUp(current))
      else               applyUserZoom(snapZoomDown(current))
    }

    // ── Touch pinch ──
    const activeTouches = new Map()
    let lastPinchDist = null

    const onTouchStart = (e) => {
      Array.from(e.changedTouches).forEach(t => {
        activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY })
      })
      if (activeTouches.size < 2) lastPinchDist = null
    }

    const onTouchMove = (e) => {
      Array.from(e.changedTouches).forEach(t => {
        if (activeTouches.has(t.identifier)) {
          activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY })
        }
      })
      if (activeTouches.size >= 2) {
        const pts  = [...activeTouches.values()].slice(0, 2)
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        if (lastPinchDist !== null && Math.abs(dist - lastPinchDist) > 1) {
          e.preventDefault()
          const ratio   = dist / lastPinchDist
          const current = zoomRef.current.userScale ?? zoomRef.current.fitScale
          applyUserZoom(current * ratio)
        }
        lastPinchDist = dist
      }
    }

    const onTouchEnd = (e) => {
      Array.from(e.changedTouches).forEach(t => activeTouches.delete(t.identifier))
      if (activeTouches.size < 2) lastPinchDist = null
    }

    wrapper.addEventListener('wheel',      onWheel,      { passive: false })
    wrapper.addEventListener('touchstart', onTouchStart, { passive: true  })
    wrapper.addEventListener('touchmove',  onTouchMove,  { passive: false })
    wrapper.addEventListener('touchend',   onTouchEnd,   { passive: true  })

    return () => {
      wrapper.removeEventListener('wheel',      onWheel)
      wrapper.removeEventListener('touchstart', onTouchStart)
      wrapper.removeEventListener('touchmove',  onTouchMove)
      wrapper.removeEventListener('touchend',   onTouchEnd)
    }
  }, []) // refs only — stable across renders

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={wrapperRef}
      className="flex-1 min-h-0 flex items-center justify-center overflow-auto"
      style={{ backgroundColor: '#dde1e9' }}
    >
      <div
        className="shadow-xl flex-shrink-0"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.10)' }}
      >
        <canvas ref={canvasElRef} />
      </div>
    </div>
  )
})

export default EditorCanvas
