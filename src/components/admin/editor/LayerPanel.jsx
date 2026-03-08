export default function LayerPanel({ layers, selectedLayerId, canvasRef, onSync }) {
  const getCanvas = () => canvasRef.current?.getCanvas()

  const selectLayer = (layerId) => {
    const canvas = getCanvas()
    if (!canvas) return
    const obj = canvas.getObjects().find(o => o.id === layerId)
    if (obj && obj.selectable !== false) {
      canvas.setActiveObject(obj)
    } else {
      canvas.discardActiveObject()
    }
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
    obj.set({
      locked,
      selectable: !locked,
      evented: !locked,
      hasControls: !locked,
    })
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

  const roleIcon = (role) => {
    switch (role) {
      case 'photo-slot': return 'P'
      case 'background': return 'BG'
      case 'overlay': return 'IMG'
      case 'static-text': return 'T'
      case 'dynamic-text': return 'D'
      default: return '?'
    }
  }

  const roleColor = (role) => {
    switch (role) {
      case 'photo-slot': return 'bg-pink-600'
      case 'background': return 'bg-blue-600'
      case 'overlay': return 'bg-green-600'
      case 'static-text': return 'bg-yellow-600'
      case 'dynamic-text': return 'bg-purple-600'
      default: return 'bg-gray-600'
    }
  }

  // Reverse so top layer is first in list
  const reversed = [...layers].reverse()

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/10">
        <h3 className="text-xs font-bold text-brand-text/60 uppercase tracking-wider">Layers</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {reversed.length === 0 && (
          <p className="text-brand-text/20 text-xs text-center py-6">No layers</p>
        )}

        {reversed.map((layer) => {
          const isSelected = selectedLayerId === layer.id
          return (
            <div
              key={layer.id}
              className={`flex items-center gap-1.5 px-2 py-1.5 text-xs border-b border-white/5 cursor-pointer transition ${
                isSelected
                  ? 'bg-brand-secondary/30 text-white'
                  : 'text-brand-text/70 hover:bg-white/5'
              }`}
              onClick={() => selectLayer(layer.id)}
            >
              {/* Visibility toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.id) }}
                className={`w-5 h-5 flex items-center justify-center rounded text-[10px] transition ${
                  layer.visible ? 'text-brand-text/60 hover:text-brand-text' : 'text-brand-text/20'
                }`}
                title={layer.visible ? 'Hide' : 'Show'}
              >
                {layer.visible ? 'V' : '-'}
              </button>

              {/* Role badge */}
              <span className={`${roleColor(layer.layerRole)} text-white text-[9px] px-1 py-0.5 rounded font-bold leading-none`}>
                {roleIcon(layer.layerRole)}
              </span>

              {/* Name */}
              <span className="flex-1 truncate text-[11px]">{layer.name}</span>

              {/* Reorder */}
              <button
                onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'up') }}
                className="w-4 h-4 flex items-center justify-center text-brand-text/30 hover:text-brand-text text-[10px]"
                title="Move up"
              >^</button>
              <button
                onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'down') }}
                className="w-4 h-4 flex items-center justify-center text-brand-text/30 hover:text-brand-text text-[10px]"
                title="Move down"
              >v</button>

              {/* Lock */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleLock(layer.id) }}
                className={`w-4 h-4 flex items-center justify-center text-[10px] transition ${
                  layer.locked ? 'text-yellow-400' : 'text-brand-text/30 hover:text-brand-text'
                }`}
                title={layer.locked ? 'Unlock' : 'Lock'}
              >
                {layer.locked ? 'L' : 'U'}
              </button>

              {/* Delete */}
              <button
                onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id) }}
                className="w-4 h-4 flex items-center justify-center text-brand-text/20 hover:text-red-400 text-[10px]"
                title="Delete"
              >x</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
