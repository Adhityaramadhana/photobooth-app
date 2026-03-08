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

// ─── Icons ───────────────────────────────────────────────────────────────────
const IconArrowLeft = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
)
const IconCheck = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IconSave = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
  </svg>
)

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
  const [savedOk, setSavedOk] = useState(false)
  const [msg, setMsg] = useState('')
  const [templateName, setTemplateName] = useState(frameName || '')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!frameId || loaded) return
    loadTemplate()
  }, [frameId])

  async function loadTemplate() {
    try {
      const { config } = await window.electronAPI.frame.getConfig(frameId)
      if (!config) { setLoaded(true); return }

      setTemplateName(config.name || frameName || '')

      if (config.version === 2 && config.fabricJson) {
        const w = config.canvas?.width || 1200
        const h = config.canvas?.height || 1800
        const dpi = config.canvas?.dpi || 300
        const ori = config.canvas?.orientation || (w <= h ? 'vertical' : 'horizontal')
        const ps = config.canvas?.paperSize || detectPreset(w, h, dpi)

        setLayout({ paperSize: ps, orientation: ori, dpi, widthPx: w, heightPx: h })

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

      // v1 legacy
      const { data: pngBase64 } = await window.electronAPI.frame.getPng(frameId)
      if (pngBase64) {
        try {
          const img = await FabricImage.fromURL(pngBase64, { crossOrigin: 'anonymous' })
          const imgW = img.width
          const imgH = img.height

          let bestPaper = '4x6'
          let bestDiff = Infinity
          for (const [key, size] of Object.entries(PAPER_SIZES)) {
            const diff = Math.abs((size.width / size.height) - (imgW / imgH))
            if (diff < bestDiff) { bestDiff = diff; bestPaper = key }
          }

          const size = PAPER_SIZES[bestPaper]
          const ori = size.width <= size.height ? 'vertical' : 'horizontal'
          setLayout({ paperSize: bestPaper, orientation: ori, dpi: 300, widthPx: size.width, heightPx: size.height })

          await new Promise(r => setTimeout(r, 200))
          const canvas = canvasRef.current?.getCanvas()
          if (canvas) {
            if (config.slots) {
              const scaleX = canvas.width / imgW
              const scaleY = canvas.height / imgH
              config.slots.forEach((slot, i) => {
                const rect = new Rect({
                  left: Math.round(slot.x * scaleX),
                  top: Math.round(slot.y * scaleY),
                  width: Math.round(slot.width * scaleX),
                  height: Math.round(slot.height * scaleY),
                  fill: 'rgba(233, 69, 96, 0.45)',
                  stroke: '#e94560',
                  strokeWidth: 2,
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
    setMsg('')
    try {
      const config = buildTemplateConfig(canvas, {
        id: frameId,
        name: templateName || frameName || frameId,
        paperSize: layout.paperSize,
        dpi: layout.dpi,
        orientation: layout.orientation,
      })

      const cw = config.canvas?.width  || canvas.width
      const ch = config.canvas?.height || canvas.height

      // Detect if overlay extends beyond canvas — transform slots accordingly
      const overlayLayer = config.layers.find(l =>
        l.layerRole === 'overlay' || l.layerRole === 'background'
      )
      let slotTransform = null
      if (overlayLayer) {
        const ol = overlayLayer.left || 0
        const ot = overlayLayer.top  || 0
        const ow = overlayLayer.width  || cw
        const oh = overlayLayer.height || ch
        const oob = ol < -2 || ot < -2 || ol + ow > cw + 2 || ot + oh > ch + 2
        if (oob && ow > 0 && oh > 0) {
          slotTransform = { ol, ot, sx: cw / ow, sy: ch / oh }
        }
      }

      config.slots = config.layers
        .filter(l => l.layerRole === 'photo-slot')
        .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
        .map(l => {
          let x = l.left, y = l.top, w = l.width, h = l.height
          // Transform slot positions to match the auto-fitted overlay in frame PNG
          if (slotTransform) {
            x = Math.round((x - slotTransform.ol) * slotTransform.sx)
            y = Math.round((y - slotTransform.ot) * slotTransform.sy)
            w = Math.round(w * slotTransform.sx)
            h = Math.round(h * slotTransform.sy)
          }
          // Safety clamp
          x = Math.max(0, x)
          y = Math.max(0, y)
          w = Math.min(w, cw - x)
          h = Math.min(h, ch - y)
          return { x, y, width: w, height: h }
        })
        .filter(s => s.width > 10 && s.height > 10)
      config.thumbnailSlot = 0

      const result = await window.electronAPI.frame.saveConfig(frameId, config)
      if (result.success) {
        // ── Export frame preview PNG ─────────────────────────────────────────
        // Hide photo-slot rects + clear canvas background so slot areas become
        // transparent in the exported PNG. This lets SelectFrame show the live
        // camera feed "through" the frame overlay in those areas.
        try {
          const slotObjs = canvas.getObjects().filter(o => o.layerRole === 'photo-slot')
          slotObjs.forEach(o => { o.visible = false })

          const savedBg = canvas.backgroundColor
          canvas.backgroundColor = null   // transparent background for PNG export

          // Auto-fit overlay/background images that extend beyond canvas bounds
          // so the exported PNG matches what the admin sees in the zoomed editor
          const fitTargets = canvas.getObjects().filter(o =>
            (o.layerRole === 'overlay' || o.layerRole === 'background') && o.visible !== false
          )
          const savedFitProps = fitTargets.map(o => ({
            obj: o, left: o.left, top: o.top, scaleX: o.scaleX, scaleY: o.scaleY,
          }))
          fitTargets.forEach(o => {
            const rw = o.getScaledWidth()
            const rh = o.getScaledHeight()
            const oob = o.left < 0 || o.top < 0 ||
                        o.left + rw > canvas.width * 1.01 ||
                        o.top + rh > canvas.height * 1.01
            if (oob) {
              // Scale to cover the canvas exactly (object-fit: cover)
              const coverScale = Math.max(canvas.width / o.width, canvas.height / o.height)
              o.set({
                left: (canvas.width - o.width * coverScale) / 2,
                top: (canvas.height - o.height * coverScale) / 2,
                scaleX: coverScale,
                scaleY: coverScale,
              })
            }
          })

          // Reset viewport to identity so we export at full canvas resolution
          const savedVPT = [...canvas.viewportTransform]
          canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
          canvas.renderAll()

          const pngDataUrl = canvas.toDataURL({ format: 'png' })

          // Restore canvas state
          canvas.setViewportTransform(savedVPT)
          canvas.backgroundColor = savedBg
          slotObjs.forEach(o => { o.visible = true })
          savedFitProps.forEach(({ obj, left, top, scaleX, scaleY }) => {
            obj.set({ left, top, scaleX, scaleY })
          })
          canvas.renderAll()

          await window.electronAPI.frame.uploadPng(frameId, pngDataUrl)
        } catch (pngErr) {
          console.warn('[TemplateEditor] Preview PNG export failed:', pngErr)
          // Non-fatal — config is already saved; just no thumbnail
        }
        // ────────────────────────────────────────────────────────────────────

        setSavedOk(true)
        setTimeout(() => setSavedOk(false), 2500)
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

  const handleLayoutChange = (newLayout) => {
    const canvas = canvasRef.current?.getCanvas()
    const dimChanged = newLayout.widthPx !== layout.widthPx || newLayout.heightPx !== layout.heightPx

    if (!canvas || !dimChanged) {
      setLayout(newLayout)
      return
    }

    const json = canvas.toJSON(CUSTOM_PROPS)
    setLayout(newLayout)

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
    <div className="flex flex-col h-full bg-brand-primary">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-brand-surface border-b border-white/8 flex-shrink-0">
        {/* Back / breadcrumb */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-brand-text/50 hover:text-brand-text transition-colors group"
        >
          <IconArrowLeft />
          <span className="text-xs hidden sm:inline">Frame Manager</span>
        </button>

        <span className="text-white/15 text-sm hidden sm:inline">/</span>

        {/* Template name input */}
        <input
          className="flex-1 max-w-xs px-2.5 py-1 bg-transparent border-b border-white/15 hover:border-white/30 focus:border-brand-secondary text-sm text-brand-text outline-none transition-colors placeholder-brand-text/25"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Template name…"
        />

        {/* Status message */}
        {msg && (
          <span className="text-red-400 text-xs">{msg}</span>
        )}

        <div className="flex-1" />

        {/* Saved indicator */}
        {savedOk && (
          <div className="flex items-center gap-1.5 text-green-400 text-xs">
            <IconCheck />
            <span>Saved</span>
          </div>
        )}

        {/* Canvas info */}
        <span className="text-[10px] text-brand-text/25 font-mono hidden lg:inline">
          {layout.widthPx} × {layout.heightPx} px · {layout.dpi} dpi
        </span>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-1.5 bg-brand-secondary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary/90 transition-colors disabled:opacity-50"
        >
          <IconSave />
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* ── Toolbar ── */}
      <EditorToolbar
        canvasRef={canvasRef}
        frameId={frameId}
        onSync={syncLayers}
      />

      {/* ── Main 3-column area ── */}
      <div className="flex-1 flex min-h-0">

        {/* Left: Layers + Layout */}
        <div className="w-56 flex-shrink-0 bg-brand-surface border-r border-white/8 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <LayerPanel
              layers={layers}
              selectedLayerId={selectedLayerId}
              canvasRef={canvasRef}
              onSync={syncLayers}
            />
          </div>
          <div className="border-t border-white/8 overflow-y-auto" style={{ maxHeight: '48%' }}>
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

        {/* Right: Properties */}
        <div className="w-56 flex-shrink-0 bg-brand-surface border-l border-white/8 overflow-hidden">
          <PropertiesPanel
            canvasRef={canvasRef}
            selectedLayerId={selectedLayerId}
          />
        </div>
      </div>
    </div>
  )
}
