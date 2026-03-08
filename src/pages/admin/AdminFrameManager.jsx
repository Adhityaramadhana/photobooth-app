import { useState, useEffect } from 'react'
import TemplateEditor from '../../components/admin/editor/TemplateEditor'

export default function AdminFrameManager() {
  const [frames, setFrames] = useState([])
  const [editingFrame, setEditingFrame] = useState(null) // { id, name }
  const [msg, setMsg] = useState('')

  useEffect(() => { loadFrames() }, [])

  const loadFrames = async () => {
    const { frames: list } = await window.electronAPI.frame.getList()
    setFrames(list ?? [])
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
      setMsg(`"${file.name}" uploaded`)
      setTimeout(() => setMsg(''), 2000)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleDeleteFrame = async (frameId) => {
    if (!confirm(`Delete template "${frameId}"?`)) return
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
    <div className="p-6 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-brand-text">Template Manager</h2>
        {msg && <span className="text-green-400 text-sm">{msg}</span>}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleNewTemplate}
          className="px-4 py-2 bg-brand-secondary text-white text-sm rounded-lg hover:opacity-90 transition"
        >
          + New Template
        </button>
        <label className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-surface border border-white/10 text-brand-text text-sm rounded-lg cursor-pointer hover:border-white/30 transition">
          <span>Upload Frame PNG</span>
          <input type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={handleUploadPng} />
        </label>
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto">
        {frames.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-brand-text/30 text-sm">
              No templates yet. Create a new template or upload a frame PNG.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

function FrameCard({ frame, onEdit, onDelete }) {
  const [thumb, setThumb] = useState(null)

  useEffect(() => {
    window.electronAPI.frame.getPng(frame.id).then(({ data }) => {
      if (data) setThumb(data)
    }).catch(() => {})
  }, [frame.id])

  const slotCount = frame.slots?.length ?? 0

  return (
    <div
      className="bg-brand-surface border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition cursor-pointer group"
      onClick={onEdit}
    >
      {/* Thumbnail */}
      <div className="aspect-[3/4] bg-black/30 flex items-center justify-center overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={frame.name} className="w-full h-full object-contain" draggable={false} />
        ) : (
          <div className="text-brand-text/10 text-4xl">
            {frame.version === 2 ? 'T' : 'F'}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2">
        <p className="text-sm text-brand-text truncate font-medium">{frame.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-brand-text/40">
            {slotCount} photo{slotCount !== 1 ? 's' : ''}
            {frame.version === 2 ? ' | v2' : ''}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="text-brand-text/20 hover:text-red-400 text-xs transition opacity-0 group-hover:opacity-100"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
