import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Canvas } from 'fabric'

const EditorCanvas = forwardRef(function EditorCanvas({ canvasWidth, canvasHeight, onSelectionChange, onLayersChange }, ref) {
  const canvasElRef = useRef(null)
  const fabricRef = useRef(null)
  const wrapperRef = useRef(null)

  // Use refs for callbacks to avoid stale closures in canvas events
  const onLayersChangeRef = useRef(onLayersChange)
  onLayersChangeRef.current = onLayersChange
  const onSelectionChangeRef = useRef(onSelectionChange)
  onSelectionChangeRef.current = onSelectionChange

  // Stable dimension key for useEffect dependency
  const dimKey = `${canvasWidth}x${canvasHeight}`

  // Expose fabric canvas to parent
  useImperativeHandle(ref, () => ({
    getCanvas: () => fabricRef.current,
    dispose: () => {
      if (fabricRef.current) {
        fabricRef.current.dispose()
        fabricRef.current = null
      }
    },
  }))

  function syncLayers() {
    const canvas = fabricRef.current
    if (!canvas) return
    const objects = canvas.getObjects()
    const layers = objects.map(obj => ({
      id: obj.id,
      name: obj.name || 'Unnamed',
      layerRole: obj.layerRole || obj.type,
      visible: obj.visible !== false,
      locked: obj.locked || false,
      type: obj.type,
    }))
    onLayersChangeRef.current?.(layers)
  }

  // Init fabric canvas
  useEffect(() => {
    if (!canvasElRef.current || !canvasWidth || !canvasHeight) return
    if (fabricRef.current) {
      fabricRef.current.dispose()
      fabricRef.current = null
    }

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
    canvas.on('object:added', syncLayers)
    canvas.on('object:removed', syncLayers)

    // Draw slot numbers on photo-slot rects
    canvas.on('after:render', () => {
      const ctx = canvas.getContext()
      if (!ctx) return
      canvas.getObjects().forEach(obj => {
        if (obj.layerRole === 'photo-slot' && obj.visible !== false) {
          const center = obj.getCenterPoint()
          const zoom = canvas.getZoom()
          ctx.save()
          ctx.font = `bold ${Math.round(48 * zoom)}px Arial`
          ctx.fillStyle = 'rgba(0,0,0,0.4)'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(`${(obj.slotIndex ?? 0) + 1}`, center.x * zoom, center.y * zoom)
          ctx.restore()
        }
      })
    })

    // Initial zoom fit
    applyZoom(canvas)

    return () => {
      canvas.dispose()
      fabricRef.current = null
    }
  }, [dimKey])

  // Responsive zoom on container resize
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

  function applyZoom(canvas) {
    const wrapper = wrapperRef.current
    if (!wrapper || !canvas) return
    const padding = 40
    const maxW = wrapper.clientWidth - padding
    const maxH = wrapper.clientHeight - padding
    if (maxW <= 0 || maxH <= 0) return

    const zoom = Math.min(maxW / canvas.width, maxH / canvas.height, 1)
    canvas.setZoom(zoom)
    canvas.setDimensions({
      width: canvas.width * zoom,
      height: canvas.height * zoom,
    }, { cssOnly: true })
    canvas.renderAll()
  }

  return (
    <div
      ref={wrapperRef}
      className="flex-1 min-h-0 flex items-center justify-center bg-[#0d0d1a] overflow-hidden"
    >
      <div className="shadow-2xl">
        <canvas ref={canvasElRef} />
      </div>
    </div>
  )
})

export default EditorCanvas
