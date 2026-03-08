import { Rect, FabricText, FabricImage } from 'fabric'
import { uid, getNextSlotIndex } from '../../../utils/fabricHelpers'

const DYNAMIC_FIELDS = [
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'session_id', label: 'Session Number' },
  { value: 'studio_name', label: 'Studio Name' },
]

// ─── Icons ───────────────────────────────────────────────────────────────────
const IconCamera = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)
const IconType = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
)
const IconImage = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)
const IconBackground = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2" />
    <path d="M2 12h20M12 2v20" strokeDasharray="4 3" />
  </svg>
)
const IconData = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const IconChevronDown = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const IconTrash = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

// ─── Component ────────────────────────────────────────────────────────────────
export default function EditorToolbar({ canvasRef, frameId, onSync }) {
  const getCanvas = () => canvasRef.current?.getCanvas()

  const addPhotoSlot = () => {
    const canvas = getCanvas()
    if (!canvas) return
    const idx = getNextSlotIndex(canvas)
    const rect = new Rect({
      left: 50 + idx * 30,
      top: 50 + idx * 30,
      width: 400,
      height: 300,
      fill: 'rgba(233, 69, 96, 0.45)',
      stroke: '#e94560',
      strokeWidth: 2,
      rx: 4, ry: 4,
      id: uid('slot'),
      name: `Photo ${idx + 1}`,
      layerRole: 'photo-slot',
      slotIndex: idx,
      locked: false,
    })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    canvas.renderAll()
    onSync?.()
  }

  const addText = () => {
    const canvas = getCanvas()
    if (!canvas) return
    const text = new FabricText('Your Text', {
      left: 100, top: 100, fontSize: 48, fontFamily: 'Arial', fill: '#333333',
      id: uid('text'), name: 'Text', layerRole: 'static-text', locked: false,
    })
    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
    onSync?.()
  }

  const addDynamicText = (field) => {
    const canvas = getCanvas()
    if (!canvas) return
    const label = DYNAMIC_FIELDS.find(f => f.value === field)?.label ?? field
    const text = new FabricText(`<<${label}>>`, {
      left: 100, top: 100, fontSize: 32, fontFamily: 'Arial', fill: '#666666',
      id: uid('dtext'), name: label, layerRole: 'dynamic-text', dynamicField: field, locked: false,
    })
    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
    onSync?.()
  }

  const addImage = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/webp'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const base64 = ev.target.result
        const canvas = getCanvas()
        if (!canvas) return
        const fileName = `asset-${Date.now()}-${file.name}`
        if (frameId) await window.electronAPI.frame.uploadAsset(frameId, fileName, base64)
        try {
          const img = await FabricImage.fromURL(base64, { crossOrigin: 'anonymous' })
          // Scale to cover the full canvas (like object-fit: cover), centered
          const coverScale = Math.max(
            canvas.width / img.width,
            canvas.height / img.height,
          )
          const fitLeft = (canvas.width - img.width * coverScale) / 2
          const fitTop = (canvas.height - img.height * coverScale) / 2
          img.set({
            left: fitLeft, top: fitTop, scaleX: coverScale, scaleY: coverScale,
            id: uid('img'), name: file.name.replace(/\.[^.]+$/, ''),
            layerRole: 'overlay', locked: false, _assetFileName: fileName,
          })
          canvas.add(img)
          canvas.setActiveObject(img)
          canvas.renderAll()
          onSync?.()
        } catch (err) { console.error('Failed to load image:', err) }
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const setBackground = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/webp'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const base64 = ev.target.result
        const canvas = getCanvas()
        if (!canvas) return
        const fileName = `bg-${Date.now()}-${file.name}`
        if (frameId) await window.electronAPI.frame.uploadAsset(frameId, fileName, base64)
        const existing = canvas.getObjects().find(o => o.layerRole === 'background')
        if (existing) canvas.remove(existing)
        try {
          const img = await FabricImage.fromURL(base64, { crossOrigin: 'anonymous' })
          img.set({
            left: 0, top: 0,
            scaleX: canvas.width / img.width,
            scaleY: canvas.height / img.height,
            id: uid('bg'), name: 'Background', layerRole: 'background',
            locked: false, selectable: true, _assetFileName: fileName,
          })
          canvas.insertAt(0, img)
          canvas.renderAll()
          onSync?.()
        } catch (err) { console.error('Failed to load background:', err) }
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const deleteSelected = () => {
    const canvas = getCanvas()
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (active) {
      canvas.remove(active)
      canvas.discardActiveObject()
      canvas.renderAll()
      onSync?.()
    }
  }

  // Shared styles
  const toolBtn = 'flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-brand-text/60 hover:text-brand-text hover:bg-white/8 rounded-md transition-colors'
  const sep = <div className="w-px h-5 bg-white/10 mx-0.5" />

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 bg-brand-primary border-b border-white/8 flex-shrink-0">

      {/* Group label */}
      <span className="text-[9px] font-semibold text-brand-text/25 uppercase tracking-widest mr-1.5 select-none">
        Add
      </span>

      {/* Photo slot */}
      <button onClick={addPhotoSlot} className={toolBtn} title="Add a photo slot — drag to position">
        <IconCamera />
        <span>Photo Slot</span>
      </button>

      {/* Text */}
      <button onClick={addText} className={toolBtn} title="Add a static text element">
        <IconType />
        <span>Text</span>
      </button>

      {/* Image */}
      <button onClick={addImage} className={toolBtn} title="Add an image overlay">
        <IconImage />
        <span>Image</span>
      </button>

      {/* Background */}
      <button onClick={setBackground} className={toolBtn} title="Set canvas background image">
        <IconBackground />
        <span>Background</span>
      </button>

      {sep}

      {/* Session data (dynamic text) */}
      <div className="relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-brand-text/60 hover:text-brand-text hover:bg-white/8 rounded-md transition-colors cursor-pointer">
        <IconData />
        <select
          onChange={(e) => { if (e.target.value) { addDynamicText(e.target.value); e.target.value = '' } }}
          defaultValue=""
          className="appearance-none bg-transparent text-xs text-inherit cursor-pointer outline-none"
          title="Insert a dynamic session data field"
        >
          <option value="" disabled>Session Data</option>
          {DYNAMIC_FIELDS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <IconChevronDown />
      </div>

      {sep}

      {/* Delete */}
      <button
        onClick={deleteSelected}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-brand-text/40 hover:text-red-400 hover:bg-red-500/8 rounded-md transition-colors"
        title="Delete selected element (Del)"
      >
        <IconTrash />
        <span>Delete</span>
      </button>
    </div>
  )
}
