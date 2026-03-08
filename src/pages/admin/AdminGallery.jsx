import { useState, useEffect } from 'react'

export default function AdminGallery() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    window.electronAPI.admin.getGallery().then(({ sessions: list }) => {
      setSessions(list ?? [])
      setLoading(false)
    })
  }, [])

  const formatDate = (ts) => {
    if (!ts) return '-'
    return new Date(ts).toLocaleString('id-ID')
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-brand-text mb-6">Gallery</h1>

      {loading && <p className="text-brand-text/40">Memuat...</p>}

      {!loading && sessions.length === 0 && (
        <p className="text-brand-text/30">Belum ada sesi foto.</p>
      )}

      <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => setSelected(session)}
            className="flex flex-col gap-2 bg-brand-surface border border-white/10 rounded-xl p-3 text-left hover:border-brand-secondary transition"
          >
            {session.photos[0] ? (
              <img
                src={`file://${session.photos[0]}`}
                className="w-full aspect-[4/3] object-cover rounded-lg"
                alt="thumbnail"
              />
            ) : (
              <div className="w-full aspect-[4/3] bg-brand-primary rounded-lg flex items-center justify-center">
                <span className="text-brand-text/20 text-sm">No photo</span>
              </div>
            )}
            <div>
              <p className="text-brand-text text-sm font-medium">{session.photoCount} foto</p>
              <p className="text-brand-text/40 text-xs">{formatDate(session.timestamp)}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Modal detail sesi */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-brand-surface rounded-2xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-brand-text">Sesi: {formatDate(selected.timestamp)}</h2>
              <button onClick={() => setSelected(null)} className="text-brand-text/40 hover:text-brand-text">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {selected.photos.map((p, i) => (
                <img key={i} src={`file://${p}`} className="w-full rounded-lg" alt={`foto ${i+1}`} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
