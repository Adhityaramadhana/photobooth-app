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

  // Pan state — used by both Space+drag and middle-mouse-drag
  const panRef       = useRef({ active: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 })
  const spaceHeldRef = useRef(false)

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

  // ── Space key → enter pan mode (grab cursor + disable fabric selection) ────
  useEffect(() => {
    const enterPan = (e) => {
      if (e.repeat || e.code !== 'Space') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      spaceHeldRef.current = true
      const canvas = fabricRef.current
      if (canvas) {
        canvas.defaultCursor = 'grab'
        canvas.hoverCursor   = 'grab'
        canvas.selection     = false
      }
      if (wrapperRef.current) wrapperRef.current.style.cursor = 'grab'
    }

    const exitPan = (e) => {
      if (e.code !== 'Space') return
      spaceHeldRef.current = false
      // Only restore cursor/selection if not mid-drag (mouseup will handle that)
      if (!panRef.current.active) {
        const canvas = fabricRef.current
        if (canvas) {
          canvas.defaultCursor = 'default'
          canvas.hoverCursor   = 'move'
          canvas.selection     = true
        }
        if (wrapperRef.current) wrapperRef.current.style.cursor = ''
      }
    }

    window.addEventListener('keydown', enterPan)
    window.addEventListener('keyup',   exitPan)
    return () => {
      window.removeEventListener('keydown', enterPan)
      window.removeEventListener('keyup',   exitPan)
    }
  }, []) // refs only — always current

  // ── Pan: Middle-mouse drag OR Space + left-drag ────────────────────────────
  // Uses capture-phase mousedown on the wrapper so the Space+drag path can call
  // stopPropagation() before fabric.js sees the event on the canvas element.
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const onMouseDown = (e) => {
      const isMidMouse  = e.button === 1
      const isSpaceDrag = e.button === 0 && spaceHeldRef.current
      if (!isMidMouse && !isSpaceDrag) return

      e.preventDefault()
      // Stop the event from reaching fabric.js (which listens in bubble phase)
      if (isSpaceDrag) e.stopPropagation()

      panRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: wrapper.scrollLeft,
        scrollTop:  wrapper.scrollTop,
      }
      wrapper.style.cursor = 'grabbing'
      // Disable fabric selection while panning (already done for space, but
      // also needed for middle-mouse so fabric doesn't start a selection rect)
      const canvas = fabricRef.current
      if (canvas) canvas.selection = false
    }

    const onMouseMove = (e) => {
      if (!panRef.current.active) return
      wrapper.scrollLeft = panRef.current.scrollLeft - (e.clientX - panRef.current.startX)
      wrapper.scrollTop  = panRef.current.scrollTop  - (e.clientY - panRef.current.startY)
    }

    const onMouseUp = () => {
      if (!panRef.current.active) return
      panRef.current.active = false
      const canvas = fabricRef.current
      if (spaceHeldRef.current) {
        // Space is still held — stay in grab mode, just stop moving
        wrapper.style.cursor = 'grab'
      } else {
        // Restore fabric to normal interactive state
        if (canvas) {
          canvas.defaultCursor = 'default'
          canvas.hoverCursor   = 'move'
          canvas.selection     = true
        }
        wrapper.style.cursor = ''
      }
    }

    // capture:true → fires BEFORE fabric's bubble-phase listeners on the canvas
    wrapper.addEventListener('mousedown', onMouseDown, { capture: true })
    window.addEventListener('mousemove',  onMouseMove)
    window.addEventListener('mouseup',    onMouseUp)

    return () => {
      wrapper.removeEventListener('mousedown', onMouseDown, { capture: true })
      window.removeEventListener('mousemove',  onMouseMove)
      window.removeEventListener('mouseup',    onMouseUp)
    }
  }, []) // refs only — always current

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
  // Wrapper structure:
  //
  //  outer [wrapperRef]  overflow:auto, flex:1
  //    └─ inner          width:max-content + min-width/height:100% + flex-center
  //         └─ canvas shadow wrapper
  //
  // Key insight — why both width:max-content AND min-width:100% are needed:
  //
  //   justify-content:center inside overflow:auto distributes overflow
  //   SYMMETRICALLY (left + right). Browser scroll only goes from 0 → right,
  //   so the left half of the overflow is permanently clipped.
  //
  //   Fix: make inner div width = canvas + padding exactly, using max-content.
  //   Then there is no left overflow — the canvas starts right after the 20px
  //   padding and only extends to the right. scrollLeft=0 always shows the
  //   left edge ✓.
  //
  //   min-width:100% keeps the inner div at least as wide as the viewport
  //   so centering still works when the canvas is smaller than the viewport.
  //   Same logic applies vertically with min-height:100%.
  return (
    <div
      ref={wrapperRef}
      className="flex-1 min-h-0 overflow-auto"
      style={{ backgroundColor: '#dde1e9' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 'max-content',   // expands to fit canvas exactly → no left-clip
          minWidth: '100%',       // at least viewport width → centering when small
          minHeight: '100%',      // at least viewport height → centering when short
          padding: '20px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            flexShrink: 0,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.10)',
          }}
        >
          <canvas ref={canvasElRef} />
        </div>
      </div>
    </div>
  )
})

export default EditorCanvas
