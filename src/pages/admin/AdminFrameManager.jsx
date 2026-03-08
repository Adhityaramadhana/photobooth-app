import { useState, useEffect, useRef } from 'react'

export default function AdminFrameManager() {
  const wrapperRef = useRef(null)
  const dragRef = useRef(null)

  const [frames, setFrames] = useState([])
  const [selectedFrameId, setSelectedFrameId] = useState(null)
  const [frameBase64, setFrameBase64] = useState(null)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [saved, setSaved] = useState(false)
  const [msg, setMsg] = useState('')
  const [wrapperSize, setWrapperSize] = useState({ w: 0, h: 0 })

  useEffect(() => { loadFrames() }, [])

  const loadFrames = async () => {
    const { frames: list } = await window.electronAPI.frame.getList()
    setFrames(list ?? [])
  }

  // Track wrapper size so canvas scales responsively
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      setWrapperSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const hasImage = imgSize.w > 0 && imgSize.h > 0
  const hasWrapper = wrapperSize.w > 0 && wrapperSize.h > 0
  const scale = (hasImage && hasWrapper)
    ? Math.min(wrapperSize.w / imgSize.w, wrapperSize.h / imgSize.h)
    : 1
  const canvasW = hasImage ? imgSize.w * scale : 0
  const canvasH = hasImage ? imgSize.h * scale : 0

  const handleSelectFrame = async (frameId) => {
    setSelectedFrameId(frameId)
    setSelectedSlot(null)
    setSaved(false)
    setFrameBase64(null)
    setImgSize({ w: 0, h: 0 })
    setSlots([])

    const { data: base64 } = await window.electronAPI.frame.getPng(frameId)
    if (!base64) return

    const img = new Image()
    img.onload = async () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
      setFrameBase64(base64)
      const { config } = await window.electronAPI.frame.getConfig(frameId)
      setSlots(config?.slots ?? [])
    }
    img.src = base64
  }

  const handleAddSlot = () => {
    if (!selectedFrameId || !hasImage) return
    setSlots(prev => [...prev, {
      x: 100, y: 100,
      width: Math.round(imgSize.w * 0.25),
      height: Math.round(imgSize.h * 0.25),
    }])
    setSelectedSlot(slots.length)
    setSaved(false)
  }

  const handleDeleteSlot = () => {
    if (selectedSlot === null) return
    setSlots(prev => prev.filter((_, i) => i !== selectedSlot))
    setSelectedSlot(null)
    setSaved(false)
  }

  const handleSave = async () => {
    if (!selectedFrameId) return
    const frame = frames.find(f => f.id === selectedFrameId)
    const config = {
      id: selectedFrameId,
      name: frame?.name ?? selectedFrameId,
      thumbnailSlot: 0,
      slots,
    }
    const result = await window.electronAPI.frame.saveConfig(selectedFrameId, config)
    if (result.success) {
      setSaved(true)
      setMsg('Tersimpan!')
      await loadFrames()
      setTimeout(() => setMsg(''), 2000)
    }
  }

  const handleUploadPng = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const frameId = `frame-${Date.now()}`
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      await window.electronAPI.frame.uploadPng(frameId, base64)
      await window.electronAPI.frame.saveConfig(frameId, {
        id: frameId, name: file.name.replace('.png', ''), thumbnailSlot: 0, slots: []
      })
      await loadFrames()
      setMsg(`Frame "${frameId}" ditambahkan`)
      setTimeout(() => setMsg(''), 2000)
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteFrame = async (frameId) => {
    if (!confirm(`Hapus frame "${frameId}"?`)) return
    await window.electronAPI.frame.delete(frameId)
    if (selectedFrameId === frameId) {
      setSelectedFrameId(null)
      setFrameBase64(null)
      setImgSize({ w: 0, h: 0 })
      setSlots([])
      setSelectedSlot(null)
    }
    await loadFrames()
  }

  // ── Drag / Resize via pointer events ────────────────────────────────────────

  const handlePointerDown = (e, idx, action) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedSlot(idx)
    dragRef.current = { action, idx, startX: e.clientX, startY: e.clientY, orig: { ...slots[idx] } }
  }

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current
      if (!d) return
      const dx = (e.clientX - d.startX) / scale
      const dy = (e.clientY - d.startY) / scale

      setSlots(prev => {
        const next = [...prev]
        const s = { ...d.orig }
        switch (d.action) {
          case 'move':
            s.x = Math.max(0, Math.round(s.x + dx))
            s.y = Math.max(0, Math.round(s.y + dy))
            break
          case 'resize-tl':
            s.x = Math.round(d.orig.x + dx)
            s.y = Math.round(d.orig.y + dy)
            s.width = Math.max(50, Math.round(d.orig.width - dx))
            s.height = Math.max(50, Math.round(d.orig.height - dy))
            break
          case 'resize-tr':
            s.y = Math.round(d.orig.y + dy)
            s.width = Math.max(50, Math.round(d.orig.width + dx))
            s.height = Math.max(50, Math.round(d.orig.height - dy))
            break
          case 'resize-bl':
            s.x = Math.round(d.orig.x + dx)
            s.width = Math.max(50, Math.round(d.orig.width - dx))
            s.height = Math.max(50, Math.round(d.orig.height + dy))
            break
          case 'resize-br':
            s.width = Math.max(50, Math.round(d.orig.width + dx))
            s.height = Math.max(50, Math.round(d.orig.height + dy))
            break
        }
        next[d.idx] = s
        return next
      })
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [scale])

  // ── Render ──────────────────────────────────────────────────────────────────

  const CORNERS = [
    { id: 'tl', cursor: 'nw-resize', style: { top: -6, left: -6 } },
    { id: 'tr', cursor: 'ne-resize', style: { top: -6, right: -6 } },
    { id: 'bl', cursor: 'sw-resize', style: { bottom: -6, left: -6 } },
    { id: 'br', cursor: 'se-resize', style: { bottom: -6, right: -6 } },
  ]

  return (
    <div className="p-6 flex gap-6 h-full">
      {/* Sidebar: frame list */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-3">
        <h2 className="text-lg font-bold text-brand-text">Frames</h2>

        <label className="flex items-center justify-center gap-2 px-3 py-2 bg-brand-secondary text-white rounded-lg text-sm cursor-pointer hover:opacity-90 transition">
          <span>+ Upload Frame PNG</span>
          <input type="file" accept=".png" className="hidden" onChange={handleUploadPng} />
        </label>

        <div className="flex flex-col gap-2 overflow-y-auto">
          {frames.length === 0 && (
            <p className="text-brand-text/30 text-xs text-center py-4">Belum ada frame</p>
          )}
          {frames.map((f) => (
            <div
              key={f.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm border transition ${
                selectedFrameId === f.id
                  ? 'bg-brand-secondary border-brand-secondary text-white'
                  : 'bg-brand-surface border-white/10 text-brand-text hover:border-white/30'
              }`}
              onClick={() => handleSelectFrame(f.id)}
            >
              <span className="truncate">{f.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteFrame(f.id) }}
                className="text-white/40 hover:text-red-400 ml-2 flex-shrink-0"
              >✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-text">
            {selectedFrameId ? `Edit: ${frames.find(f => f.id === selectedFrameId)?.name}` : 'Pilih frame untuk diedit'}
          </h2>
          {msg && <span className="text-green-400 text-sm">{msg}</span>}
        </div>

        {selectedFrameId && (
          <div className="flex gap-2">
            <button onClick={handleAddSlot} className="px-4 py-2 bg-brand-surface border border-white/10 text-brand-text text-sm rounded-lg hover:border-white/30 transition">
              + Tambah Slot
            </button>
            <button onClick={handleDeleteSlot} disabled={selectedSlot === null} className="px-4 py-2 bg-brand-surface border border-white/10 text-brand-text text-sm rounded-lg hover:border-red-400 disabled:opacity-30 transition">
              Hapus Slot
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-brand-secondary text-white text-sm rounded-lg hover:opacity-90 transition ml-auto">
              {saved ? '✓ Tersimpan' : 'Simpan'}
            </button>
          </div>
        )}

        {/* Canvas — fills all remaining height */}
        <div
          ref={wrapperRef}
          className="flex-1 min-h-0 border border-white/10 rounded-xl overflow-hidden bg-[#1a1a2e] flex items-center justify-center"
        >
          {frameBase64 && hasImage ? (
            <div
              className="relative select-none"
              style={{ width: canvasW, height: canvasH }}
              onClick={(e) => { if (e.target === e.currentTarget) setSelectedSlot(null) }}
            >
              {/* Frame image background */}
              <img
                src={frameBase64}
                alt="Frame"
                className="absolute inset-0 w-full h-full pointer-events-none"
                draggable={false}
              />

              {/* Slot overlays */}
              {slots.map((slot, i) => {
                const isSelected = selectedSlot === i
                return (
                  <div
                    key={i}
                    className="absolute cursor-move"
                    style={{
                      left: slot.x * scale,
                      top: slot.y * scale,
                      width: slot.width * scale,
                      height: slot.height * scale,
                      border: `2px solid ${isSelected ? '#fff' : '#e94560'}`,
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.12)' : 'rgba(233,69,96,0.18)',
                    }}
                    onPointerDown={(e) => handlePointerDown(e, i, 'move')}
                  >
                    <span className="absolute top-1 left-1 text-[10px] text-white bg-black/60 px-1 rounded pointer-events-none">
                      {i + 1}
                    </span>

                    {isSelected && CORNERS.map(c => (
                      <div
                        key={c.id}
                        className="absolute w-3 h-3 bg-white border border-brand-secondary rounded-sm"
                        style={{ cursor: c.cursor, ...c.style }}
                        onPointerDown={(e) => handlePointerDown(e, i, `resize-${c.id}`)}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          ) : selectedFrameId ? (
            <p className="text-brand-text/30 text-sm">Memuat frame...</p>
          ) : (
            <p className="text-brand-text/30 text-sm">Pilih frame dari daftar, atau upload frame PNG baru</p>
          )}
        </div>

        {selectedSlot !== null && slots[selectedSlot] && (
          <p className="text-xs text-brand-text/40 font-mono">
            Slot {selectedSlot + 1}: x={slots[selectedSlot].x} y={slots[selectedSlot].y} w={slots[selectedSlot].width} h={slots[selectedSlot].height}
          </p>
        )}
      </div>
    </div>
  )
}
