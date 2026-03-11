import { Rect, FabricImage } from 'fabric'
import { uid, getNextSlotIndex } from '../../../utils/fabricHelpers'

// ─── Icons ───────────────────────────────────────────────────────────────────
const IconCamera = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)
const IconImage = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)
const IconTrash = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)
const IconUndo = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 14 4 9 9 4" />
    <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
  </svg>
)
const IconRedo = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 14 20 9 15 4" />
    <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
  </svg>
)

// ─── Component ────────────────────────────────────────────────────────────────
export default function EditorToolbar({ canvasRef, frameId, onSync, onUndo, onRedo, canUndo, canRedo }) {
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
  const toolBtnOff = 'flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-brand-text/20 rounded-md cursor-not-allowed'
  const sep = <div className="w-px h-5 bg-white/10 mx-0.5" />

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 bg-brand-primary border-b border-white/8 flex-shrink-0">

      {/* Undo / Redo */}
      <button
        onClick={onUndo} disabled={!canUndo}
        className={canUndo ? toolBtn : toolBtnOff}
        title="Undo (Ctrl+Z)"
      >
        <IconUndo />
        <span>Undo</span>
      </button>
      <button
        onClick={onRedo} disabled={!canRedo}
        className={canRedo ? toolBtn : toolBtnOff}
        title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
      >
        <IconRedo />
        <span>Redo</span>
      </button>

      {sep}

      {/* Group label */}
      <span className="text-[9px] font-semibold text-brand-text/25 uppercase tracking-widest mr-1.5 select-none">
        Add
      </span>

      {/* Photo slot */}
      <button onClick={addPhotoSlot} className={toolBtn} title="Add a photo slot — drag to position">
        <IconCamera />
        <span>Photo Slot</span>
      </button>

      {/* Image */}
      <button onClick={addImage} className={toolBtn} title="Add an image overlay">
        <IconImage />
        <span>Image</span>
      </button>

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
