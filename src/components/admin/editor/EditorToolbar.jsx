import { Rect, FabricText, FabricImage } from 'fabric'
import { uid, getNextSlotIndex } from '../../../utils/fabricHelpers'

const DYNAMIC_FIELDS = [
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'session_id', label: 'Session Number' },
  { value: 'studio_name', label: 'Studio Name' },
]

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
      fill: 'rgba(200, 200, 200, 0.25)',
      stroke: '#e94560',
      strokeWidth: 3,
      strokeDashArray: [10, 5],
      rx: 4,
      ry: 4,
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
      left: 100,
      top: 100,
      fontSize: 48,
      fontFamily: 'Arial',
      fill: '#333333',
      id: uid('text'),
      name: 'Text',
      layerRole: 'static-text',
      locked: false,
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
      left: 100,
      top: 100,
      fontSize: 32,
      fontFamily: 'Arial',
      fill: '#666666',
      id: uid('dtext'),
      name: label,
      layerRole: 'dynamic-text',
      dynamicField: field,
      locked: false,
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
        if (frameId) {
          await window.electronAPI.frame.uploadAsset(frameId, fileName, base64)
        }

        try {
          const img = await FabricImage.fromURL(base64, { crossOrigin: 'anonymous' })
          const maxScale = Math.min(
            (canvas.width * 0.5) / img.width,
            (canvas.height * 0.5) / img.height,
            1
          )
          img.set({
            left: 50,
            top: 50,
            scaleX: maxScale,
            scaleY: maxScale,
            id: uid('img'),
            name: file.name.replace(/\.[^.]+$/, ''),
            layerRole: 'overlay',
            locked: false,
            _assetFileName: fileName,
          })
          canvas.add(img)
          canvas.setActiveObject(img)
          canvas.renderAll()
          onSync?.()
        } catch (err) {
          console.error('Failed to load image:', err)
        }
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
        if (frameId) {
          await window.electronAPI.frame.uploadAsset(frameId, fileName, base64)
        }

        const existing = canvas.getObjects().find(o => o.layerRole === 'background')
        if (existing) canvas.remove(existing)

        try {
          const img = await FabricImage.fromURL(base64, { crossOrigin: 'anonymous' })
          img.set({
            left: 0,
            top: 0,
            scaleX: canvas.width / img.width,
            scaleY: canvas.height / img.height,
            id: uid('bg'),
            name: 'Background',
            layerRole: 'background',
            locked: false,
            selectable: true,
            _assetFileName: fileName,
          })
          canvas.insertAt(0, img)
          canvas.renderAll()
          onSync?.()
        } catch (err) {
          console.error('Failed to load background:', err)
        }
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

  const btnClass = 'px-3 py-1.5 bg-brand-surface border border-white/10 text-brand-text text-xs rounded hover:border-white/30 transition whitespace-nowrap'

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-brand-primary border-b border-white/10">
      <span className="text-brand-text/40 text-[10px] uppercase tracking-wider mr-1">Add</span>
      <button onClick={addPhotoSlot} className={btnClass}>Photo Slot</button>
      <button onClick={addText} className={btnClass}>Text</button>
      <button onClick={addImage} className={btnClass}>Image</button>
      <button onClick={setBackground} className={btnClass}>Background</button>

      <select
        onChange={(e) => { if (e.target.value) { addDynamicText(e.target.value); e.target.value = '' } }}
        defaultValue=""
        className="px-2 py-1.5 bg-brand-surface border border-white/10 text-brand-text text-xs rounded hover:border-white/30 transition cursor-pointer"
      >
        <option value="" disabled>Session Data</option>
        {DYNAMIC_FIELDS.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      <div className="w-px h-6 bg-white/10 mx-1" />

      <button onClick={deleteSelected} className={`${btnClass} hover:border-red-400 hover:text-red-400`}>
        Delete
      </button>
    </div>
  )
}
