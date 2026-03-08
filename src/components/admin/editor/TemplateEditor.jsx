import { useState, useRef, useCallback, useEffect } from 'react'
import { FabricImage, Rect } from 'fabric'
import EditorCanvas from './EditorCanvas'
import EditorToolbar from './EditorToolbar'
import LayerPanel from './LayerPanel'
import LayoutPanel from './LayoutPanel'
import PropertiesPanel from './PropertiesPanel'
import {
  buildTemplateConfig, uid, PAPER_SIZES, CUSTOM_PROPS,
  getPresetDimensions, inchesToPx, pxToInches, PAPER_PRESETS,
} from '../../../utils/fabricHelpers'

// Detect which paper preset matches given pixel dimensions
function detectPreset(w, h, dpi) {
  for (const p of PAPER_PRESETS) {
    if (!p.wIn) continue
    const pw = inchesToPx(p.wIn, dpi)
    const ph = inchesToPx(p.hIn, dpi)
    if ((w === pw && h === ph) || (w === ph && h === pw)) return p.id
  }
  return 'custom'
}

export default function TemplateEditor({ frameId, frameName, onSave, onBack }) {
  const canvasRef = useRef(null)

  // Layout state
  const [layout, setLayout] = useState({
    paperSize: '4x6',
    orientation: 'vertical',
    dpi: 300,
    widthPx: 1200,
    heightPx: 1800,
  })

  const [layers, setLayers] = useState([])
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [templateName, setTemplateName] = useState(frameName || '')
  const [loaded, setLoaded] = useState(false)

  // Load existing template config
  useEffect(() => {
    if (!frameId || loaded) return
    loadTemplate()
  }, [frameId])

  async function loadTemplate() {
    try {
      const { config } = await window.electronAPI.frame.getConfig(frameId)
      if (!config) { setLoaded(true); return }

      setTemplateName(config.name || frameName || '')

      // v2 template with fabricJson
      if (config.version === 2 && config.fabricJson) {
        const w = config.canvas?.width || 1200
        const h = config.canvas?.height || 1800
        const dpi = config.canvas?.dpi || 300
        const ori = config.canvas?.orientation || (w <= h ? 'vertical' : 'horizontal')
        const ps = config.canvas?.paperSize || detectPreset(w, h, dpi)

        setLayout({ paperSize: ps, orientation: ori, dpi, widthPx: w, heightPx: h })

        // Wait for canvas to initialize with new dimensions
        await new Promise(r => setTimeout(r, 200))
        const canvas = canvasRef.current?.getCanvas()
        if (canvas) {
          await canvas.loadFromJSON(config.fabricJson)
          canvas.renderAll()
          syncLayers()
        }
        setLoaded(true)
        return
      }

      // v1 legacy: load frame.png as overlay + slots as rects
      const { data: pngBase64 } = await window.electronAPI.frame.getPng(frameId)
      if (pngBase64) {
        try {
          const img = await FabricImage.fromURL(pngBase64, { crossOrigin: 'anonymous' })
          const imgW = img.width
          const imgH = img.height

          // Determine best paper size from image aspect ratio
          let bestPaper = '4x6'
          let bestDiff = Infinity
          for (const [key, size] of Object.entries(PAPER_SIZES)) {
            const diff = Math.abs((size.width / size.height) - (imgW / imgH))
            if (diff < bestDiff) { bestDiff = diff; bestPaper = key }
          }

          const size = PAPER_SIZES[bestPaper]
          const ori = size.width <= size.height ? 'vertical' : 'horizontal'
          setLayout({
            paperSize: bestPaper,
            orientation: ori,
            dpi: 300,
            widthPx: size.width,
            heightPx: size.height,
          })

          await new Promise(r => setTimeout(r, 200))
          const canvas = canvasRef.current?.getCanvas()
          if (canvas) {
            // Add slots first
            if (config.slots) {
              const scaleX = canvas.width / imgW
              const scaleY = canvas.height / imgH
              config.slots.forEach((slot, i) => {
                const rect = new Rect({
                  left: Math.round(slot.x * scaleX),
                  top: Math.round(slot.y * scaleY),
                  width: Math.round(slot.width * scaleX),
                  height: Math.round(slot.height * scaleY),
                  fill: 'rgba(200, 200, 200, 0.25)',
                  stroke: '#e94560',
                  strokeWidth: 3,
                  strokeDashArray: [10, 5],
                  rx: 4, ry: 4,
                  id: uid('slot'),
                  name: `Photo ${i + 1}`,
                  layerRole: 'photo-slot',
                  slotIndex: i,
                  locked: false,
                })
                canvas.add(rect)
              })
            }

            // Add frame PNG as overlay on top
            img.set({
              left: 0, top: 0,
              scaleX: canvas.width / img.width,
              scaleY: canvas.height / img.height,
              id: uid('overlay'),
              name: 'Frame Overlay',
              layerRole: 'overlay',
              locked: false,
            })
            canvas.add(img)
            canvas.renderAll()
            syncLayers()
          }
        } catch (err) {
          console.warn('Failed to load frame PNG:', err)
        }
      }

      setLoaded(true)
    } catch (err) {
      console.error('Failed to load template:', err)
      setLoaded(true)
    }
  }

  const syncLayers = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas()
    if (!canvas) return
    const objects = canvas.getObjects()
    setLayers(objects.map(obj => ({
      id: obj.id,
      name: obj.name || 'Unnamed',
      layerRole: obj.layerRole || obj.type,
      visible: obj.visible !== false,
      locked: obj.locked || false,
      type: obj.type,
    })))
  }, [])

  const handleSelectionChange = useCallback((id) => {
    setSelectedLayerId(id)
  }, [])

  const handleSave = async () => {
    const canvas = canvasRef.current?.getCanvas()
    if (!canvas || !frameId) return

    setSaving(true)
    try {
      const config = buildTemplateConfig(canvas, {
        id: frameId,
        name: templateName || frameName || frameId,
        paperSize: layout.paperSize,
        dpi: layout.dpi,
        orientation: layout.orientation,
      })

      // Backward compat: extract slots for v1 consumers
      config.slots = config.layers
        .filter(l => l.layerRole === 'photo-slot')
        .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
        .map(l => ({ x: l.left, y: l.top, width: l.width, height: l.height }))
      config.thumbnailSlot = 0

      const result = await window.electronAPI.frame.saveConfig(frameId, config)
      if (result.success) {
        setMsg('Saved!')
        setTimeout(() => setMsg(''), 2000)
        onSave?.()
      } else {
        setMsg('Error: ' + (result.error || 'Unknown'))
      }
    } catch (err) {
      setMsg('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Handle layout changes — save/restore canvas objects when dimensions change
  const handleLayoutChange = (newLayout) => {
    const canvas = canvasRef.current?.getCanvas()
    const dimChanged = newLayout.widthPx !== layout.widthPx || newLayout.heightPx !== layout.heightPx

    if (!canvas || !dimChanged) {
      setLayout(newLayout)
      return
    }

    // Save current state before canvas re-init
    const json = canvas.toJSON(CUSTOM_PROPS)
    setLayout(newLayout)

    // Restore after canvas re-init
    setTimeout(async () => {
      const c2 = canvasRef.current?.getCanvas()
      if (c2 && json) {
        await c2.loadFromJSON(json)
        c2.renderAll()
        syncLayers()
      }
    }, 150)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-surface border-b border-white/10">
        <button
          onClick={onBack}
          className="px-3 py-1 text-xs text-brand-text/60 hover:text-brand-text border border-white/10 rounded hover:border-white/30 transition"
        >
          Back
        </button>

        <input
          className="flex-1 max-w-xs px-3 py-1 bg-brand-primary border border-white/10 rounded text-sm text-brand-text focus:border-brand-secondary outline-none"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Template name..."
        />

        {msg && <span className="text-green-400 text-xs">{msg}</span>}

        <div className="flex-1" />

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-1.5 bg-brand-secondary text-white text-sm rounded hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Toolbar */}
      <EditorToolbar
        canvasRef={canvasRef}
        frameId={frameId}
        onSync={syncLayers}
      />

      {/* Main area: 3-column layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Layers + Layout */}
        <div className="w-52 flex-shrink-0 bg-brand-surface border-r border-white/10 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <LayerPanel
              layers={layers}
              selectedLayerId={selectedLayerId}
              canvasRef={canvasRef}
              onSync={syncLayers}
            />
          </div>
          <div className="border-t border-white/10 overflow-y-auto" style={{ maxHeight: '50%' }}>
            <LayoutPanel
              layout={layout}
              onLayoutChange={handleLayoutChange}
            />
          </div>
        </div>

        {/* Center: Canvas */}
        <EditorCanvas
          ref={canvasRef}
          canvasWidth={layout.widthPx}
          canvasHeight={layout.heightPx}
          onSelectionChange={handleSelectionChange}
          onLayersChange={setLayers}
        />

        {/* Right: Properties Panel */}
        <div className="w-56 flex-shrink-0 bg-brand-surface border-l border-white/10 overflow-hidden">
          <PropertiesPanel
            canvasRef={canvasRef}
            selectedLayerId={selectedLayerId}
          />
        </div>
      </div>
    </div>
  )
}
