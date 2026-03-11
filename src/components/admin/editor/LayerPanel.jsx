import { useState, useRef } from 'react'

// ─── Icons ───────────────────────────────────────────────────────────────────
const EyeOpenIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
)
const EyeClosedIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)
const LockClosedIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const LockOpenIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
)
const ChevronUpIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
)
const ChevronDownIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const TrashIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)
// 6-dot grip — drag handle
const GripIcon = () => (
  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="8"  cy="6"  r="2" />
    <circle cx="16" cy="6"  r="2" />
    <circle cx="8"  cy="12" r="2" />
    <circle cx="16" cy="12" r="2" />
    <circle cx="8"  cy="18" r="2" />
    <circle cx="16" cy="18" r="2" />
  </svg>
)

// Role → color dot + short label
const ROLE_CONFIG = {
  'photo-slot':   { dot: '#e94560', label: 'Slot' },
  'background':   { dot: '#3b82f6', label: 'BG' },
  'overlay':      { dot: '#22c55e', label: 'IMG' },
  'static-text':  { dot: '#f59e0b', label: 'Text' },
  'dynamic-text': { dot: '#a855f7', label: 'Dyn' },
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LayerPanel({ layers, selectedLayerId, canvasRef, onSync }) {
  // dragId drives the visual (opacity) — needs state for re-render
  // dragIdRef is read inside drop handler to avoid stale closure
  const [dragId,     setDragId]     = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const dragIdRef = useRef(null)

  const getCanvas = () => canvasRef.current?.getCanvas()

  // ── Canvas operations ──────────────────────────────────────────────────────

  const selectLayer = (layerId) => {
    const canvas = getCanvas()
    if (!canvas) return
    const obj = canvas.getObjects().find(o => o.id === layerId)
    if (obj && obj.selectable !== false) canvas.setActiveObject(obj)
    else canvas.discardActiveObject()
    canvas.renderAll()
  }

  const toggleVisibility = (layerId) => {
    const canvas = getCanvas()
    if (!canvas) return
    const obj = canvas.getObjects().find(o => o.id === layerId)
    if (!obj) return
    obj.set('visible', !obj.visible)
    canvas.renderAll()
    onSync?.()
  }

  const toggleLock = (layerId) => {
    const canvas = getCanvas()
    if (!canvas) return
    const obj = canvas.getObjects().find(o => o.id === layerId)
    if (!obj) return
    const locked = !obj.locked
    obj.set({ locked, selectable: !locked, evented: !locked, hasControls: !locked })
    if (locked) canvas.discardActiveObject()
    canvas.renderAll()
    onSync?.()
  }

  const moveLayer = (layerId, direction) => {
    const canvas = getCanvas()
    if (!canvas) return
    const obj = canvas.getObjects().find(o => o.id === layerId)
    if (!obj) return
    if (direction === 'up') canvas.bringObjectForward(obj)
    if (direction === 'down') canvas.sendObjectBackwards(obj)
    canvas.renderAll()
    onSync?.()
  }

  const deleteLayer = (layerId) => {
    const canvas = getCanvas()
    if (!canvas) return
    const obj = canvas.getObjects().find(o => o.id === layerId)
    if (!obj) return
    canvas.remove(obj)
    canvas.discardActiveObject()
    canvas.renderAll()
    onSync?.()
  }

  // ── Drag-to-reorder ────────────────────────────────────────────────────────
  // Directly splice canvas._objects so the dragged layer lands at the exact
  // z-index slot that the drop-target currently occupies.
  // Proof of correctness:
  //   splice(fromIdx, 1)           → removes source, array shifts if from < to
  //   splice(originalToIdx, 0, obj) → because the shift exactly cancels out,
  //                                   obj ends up right at the target's slot ✓
  const reorderLayer = (fromId, toId) => {
    const canvas = getCanvas()
    if (!canvas) return

    const fromIdx = canvas._objects.findIndex(o => o.id === fromId)
    const toIdx   = canvas._objects.findIndex(o => o.id === toId)
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return

    const [obj] = canvas._objects.splice(fromIdx, 1)
    canvas._objects.splice(toIdx, 0, obj)

    canvas.renderAll()
    onSync?.()
  }

  // ── HTML5 DnD handlers ─────────────────────────────────────────────────────

  const handleDragStart = (e, layerId) => {
    dragIdRef.current = layerId
    setDragId(layerId)
    e.dataTransfer.effectAllowed = 'move'
    // Use a tiny off-screen ghost so the row itself doesn't clone into a
    // floating image — the highlighted row IS the visual feedback.
    const ghost = document.createElement('div')
    ghost.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    requestAnimationFrame(() => ghost.remove())
  }

  const handleDragOver = (e, layerId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (layerId !== dragIdRef.current) setDragOverId(layerId)
  }

  const handleDrop = (e, targetId) => {
    e.preventDefault()
    const fromId = dragIdRef.current   // read ref — always current value
    dragIdRef.current = null
    setDragId(null)
    setDragOverId(null)
    if (fromId && targetId && fromId !== targetId) {
      reorderLayer(fromId, targetId)
    }
  }

  const handleDragEnd = () => {
    dragIdRef.current = null
    setDragId(null)
    setDragOverId(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // Reverse so front (topmost) layer appears first in the list
  const reversed = [...layers].reverse()

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/8 flex-shrink-0">
        <h3 className="text-[10px] font-semibold text-brand-text/35 uppercase tracking-widest">Layers</h3>
        {layers.length > 0 && (
          <span className="text-[9px] text-brand-text/20 tabular-nums">{layers.length}</span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-0.5">
        {reversed.length === 0 ? (
          <p className="text-brand-text/20 text-[10px] text-center py-8 px-3 leading-relaxed">
            Add elements using<br />the toolbar above
          </p>
        ) : (
          reversed.map((layer) => {
            const isSelected = selectedLayerId === layer.id
            const isDragging = dragId === layer.id
            const isDragOver = dragOverId === layer.id && !isDragging
            const role       = ROLE_CONFIG[layer.layerRole] ?? { dot: '#666', label: '?' }

            return (
              <div
                key={layer.id}
                draggable
                onDragStart={(e) => handleDragStart(e, layer.id)}
                onDragOver={(e)  => handleDragOver(e, layer.id)}
                onDrop={(e)      => handleDrop(e, layer.id)}
                onDragEnd={handleDragEnd}
                onDragLeave={(e) => {
                  // Only clear when truly leaving this row, not a child element
                  if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) {
                    setDragOverId(null)
                  }
                }}
                className={[
                  'group flex items-center gap-1.5 px-2 py-1.5 select-none',
                  'cursor-pointer transition-colors border-l-2 border-t-2',
                  // Left selection stripe
                  isSelected
                    ? 'bg-brand-secondary/12 border-l-brand-secondary'
                    : 'border-l-transparent hover:bg-white/5',
                  // Top drop-target indicator (blue line above row)
                  isDragOver
                    ? 'border-t-brand-secondary bg-brand-secondary/8'
                    : 'border-t-transparent',
                  // Dim the row currently being dragged
                  isDragging ? 'opacity-40' : '',
                ].join(' ')}
                onClick={() => selectLayer(layer.id)}
              >
                {/* Drag handle — grab anywhere on this icon to drag */}
                <div
                  className="flex-shrink-0 cursor-grab active:cursor-grabbing text-brand-text/20 hover:text-brand-text/55 transition-colors"
                  title="Drag to reorder"
                  // Prevent click-to-select from stealing the mousedown before
                  // the browser can initiate a drag operation on the row
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripIcon />
                </div>

                {/* Visibility toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.id) }}
                  className={`flex-shrink-0 transition-colors ${
                    layer.visible ? 'text-brand-text/45 hover:text-brand-text' : 'text-brand-text/15'
                  }`}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                >
                  {layer.visible ? <EyeOpenIcon /> : <EyeClosedIcon />}
                </button>

                {/* Role color dot */}
                <div
                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: role.dot }}
                  title={role.label}
                />

                {/* Layer name */}
                <span
                  className={`flex-1 truncate text-[11px] leading-tight ${
                    isSelected ? 'text-brand-text' : 'text-brand-text/65'
                  } ${!layer.visible ? 'opacity-40' : ''}`}
                >
                  {layer.name}
                </span>

                {/* Controls — visible on hover or when selected */}
                <div className={`flex items-center gap-0.5 transition-opacity ${
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'up') }}
                    className="w-5 h-5 flex items-center justify-center text-brand-text/30 hover:text-brand-text rounded transition-colors"
                    title="Move layer up (forward)"
                  >
                    <ChevronUpIcon />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'down') }}
                    className="w-5 h-5 flex items-center justify-center text-brand-text/30 hover:text-brand-text rounded transition-colors"
                    title="Move layer down (backward)"
                  >
                    <ChevronDownIcon />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLock(layer.id) }}
                    className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
                      layer.locked ? 'text-amber-400' : 'text-brand-text/25 hover:text-brand-text'
                    }`}
                    title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  >
                    {layer.locked ? <LockClosedIcon /> : <LockOpenIcon />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id) }}
                    className="w-5 h-5 flex items-center justify-center text-brand-text/20 hover:text-red-400 rounded transition-colors"
                    title="Delete layer"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
