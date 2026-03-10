import { useState, useEffect } from 'react'
import TemplateEditor from '../../components/admin/editor/TemplateEditor'

// ─── Icons ───────────────────────────────────────────────────────────────────
const IconPlus = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const IconUpload = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
)
const IconTrash = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)
const IconEdit = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)
const IconEmpty = ({ className = 'w-10 h-10' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
)
const IconCheck = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function AdminFrameManager() {
  const [frames, setFrames] = useState([])
  const [editingFrame, setEditingFrame] = useState(null)
  const [msg, setMsg] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { loadFrames() }, [])

  const loadFrames = async () => {
    setIsLoading(true)
    const { frames: list } = await window.electronAPI.frame.getList()
    setFrames(list ?? [])
    setIsLoading(false)
  }

  const handleNewTemplate = async () => {
    const frameId = `frame-${Date.now()}`
    await window.electronAPI.frame.saveConfig(frameId, {
      id: frameId,
      name: 'New Template',
      version: 2,
      thumbnailSlot: 0,
      slots: [],
      canvas: { width: 1200, height: 1800, paperSize: '4x6', dpi: 300, backgroundColor: '#ffffff' },
      layers: [],
      fabricJson: null,
    })
    await loadFrames()
    setEditingFrame({ id: frameId, name: 'New Template' })
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
        id: frameId, name: file.name.replace(/\.[^.]+$/, ''), thumbnailSlot: 0, slots: [],
      })
      await loadFrames()
      setMsg(`Imported "${file.name.replace(/\.[^.]+$/, '')}"`)
      setTimeout(() => setMsg(''), 3000)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleDeleteFrame = async (frameId) => {
    if (!confirm('Delete this template? This cannot be undone.')) return
    await window.electronAPI.frame.delete(frameId)
    await loadFrames()
  }

  const handleEditFrame = (frame) => {
    setEditingFrame({ id: frame.id, name: frame.name })
  }

  // ── Editor view ──
  if (editingFrame) {
    return (
      <TemplateEditor
        frameId={editingFrame.id}
        frameName={editingFrame.name}
        onSave={() => loadFrames()}
        onBack={() => { setEditingFrame(null); loadFrames() }}
      />
    )
  }

  // ── List view ──
  return (
    <div className="flex flex-col h-full bg-brand-primary">

      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-brand-text tracking-tight">Frame Manager</h1>
            <p className="text-xs text-brand-text/35 mt-0.5">Design and manage photo frame templates</p>
          </div>

          {/* Toast / Status */}
          {msg && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
              <IconCheck className="w-3 h-3 text-green-400" />
              <span className="text-green-400 text-xs">{msg}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleNewTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-brand-secondary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary/90 transition-colors"
          >
            <IconPlus />
            New Template
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-brand-surface border border-white/10 text-brand-text/60 text-sm rounded-lg cursor-pointer hover:text-brand-text hover:border-white/20 transition-colors">
            <IconUpload />
            Import PNG Frame
            <input type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={handleUploadPng} />
          </label>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <span className="text-brand-text/20 text-sm">Loading templates…</span>
          </div>
        ) : frames.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-64 text-center select-none">
            <div className="w-20 h-20 rounded-2xl bg-brand-surface border border-white/8 flex items-center justify-center mb-4">
              <IconEmpty className="text-brand-text/15" />
            </div>
            <h3 className="text-sm font-medium text-brand-text/40 mb-1">No templates yet</h3>
            <p className="text-xs text-brand-text/20 max-w-[240px] mb-5 leading-relaxed">
              Create a blank template or import a frame PNG to get started.
            </p>
            <button
              onClick={handleNewTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-brand-secondary text-white text-sm rounded-lg hover:bg-brand-secondary/90 transition-colors"
            >
              <IconPlus />
              Create First Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {frames.map((frame) => (
              <FrameCard
                key={frame.id}
                frame={frame}
                onEdit={() => handleEditFrame(frame)}
                onDelete={() => handleDeleteFrame(frame.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Frame Card ───────────────────────────────────────────────────────────────
function FrameCard({ frame, onEdit, onDelete }) {
  const [thumb, setThumb] = useState(null)

  useEffect(() => {
    window.electronAPI.frame.getPng(frame.id)
      .then(({ data }) => { if (data) setThumb(data) })
      .catch(() => {})
  }, [frame.id])

  const slotCount = frame.slots?.length ?? 0
  const isV2 = frame.version === 2
  const aspectRatio = frame.canvasWidth && frame.canvasHeight
    ? frame.canvasHeight / frame.canvasWidth
    : 4 / 6

  return (
    <div
      className="group relative bg-brand-surface rounded-xl border border-white/8 overflow-hidden hover:border-white/20 transition-all duration-200 cursor-pointer"
      onClick={onEdit}
    >
      {/* Thumbnail (full-bleed, follow card border) */}
      <div
        className="relative w-full bg-[#050515] overflow-hidden"
        style={{ paddingBottom: `${aspectRatio * 100}%` }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={frame.name}
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-brand-text/8 select-none bg-[#0d0d1a]">
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
            </svg>
            <span className="text-[10px] uppercase tracking-wide">No preview</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-secondary rounded-md text-white text-xs font-medium shadow-lg">
            <IconEdit />
            Open Editor
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 text-white/50 hover:text-red-400 hover:bg-black/90 transition-all duration-150"
          title="Delete template"
        >
          <IconTrash />
        </button>

        {/* Slot count badge */}
        {slotCount > 0 && (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 bg-black/65 backdrop-blur-sm rounded text-[10px] text-white/60">
            {slotCount} photo{slotCount !== 1 ? 's' : ''}
          </div>
        )}

        {/* v2 badge */}
        {isV2 && (
          <div className="absolute top-2.5 left-2.5 px-1.5 py-0.5 bg-brand-secondary/90 rounded text-[9px] text-white font-semibold tracking-wide">
            v2
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-sm text-brand-text font-medium truncate leading-tight">{frame.name}</p>
        <p className="text-[10px] text-brand-text/25 mt-0.5 font-mono truncate">{frame.id}</p>
      </div>
    </div>
  )
}
