import { useState, useEffect, useCallback } from 'react'

export default function PropertiesPanel({ canvasRef, selectedLayerId }) {
  const [props, setProps] = useState(null)

  const getCanvas = () => canvasRef.current?.getCanvas()

  // Read properties from selected object
  const readProps = useCallback(() => {
    const canvas = getCanvas()
    if (!canvas || !selectedLayerId) { setProps(null); return }

    const obj = canvas.getObjects().find(o => o.id === selectedLayerId)
    if (!obj) { setProps(null); return }

    const base = {
      id: obj.id,
      name: obj.name || '',
      layerRole: obj.layerRole || '',
      type: obj.type,
      left: Math.round(obj.left),
      top: Math.round(obj.top),
      width: Math.round(obj.getScaledWidth()),
      height: Math.round(obj.getScaledHeight()),
      angle: Math.round(obj.angle),
      opacity: Math.round((obj.opacity ?? 1) * 100),
      visible: obj.visible !== false,
      locked: obj.locked || false,
    }

    // Text-specific
    if (obj.type === 'text' || obj.type === 'i-text') {
      base.text = obj.text || ''
      base.fontSize = obj.fontSize || 32
      base.fontFamily = obj.fontFamily || 'Arial'
      base.fill = obj.fill || '#333333'
      base.textAlign = obj.textAlign || 'left'
      base.fontWeight = obj.fontWeight || 'normal'
      base.fontStyle = obj.fontStyle || 'normal'
      base.dynamicField = obj.dynamicField || ''
    }

    // Rect (photo-slot)
    if (obj.type === 'rect') {
      base.fill = obj.fill || ''
      base.stroke = obj.stroke || ''
      base.strokeWidth = obj.strokeWidth || 0
      base.slotIndex = obj.slotIndex ?? 0
    }

    setProps(base)
  }, [selectedLayerId])

  useEffect(() => {
    readProps()

    const canvas = getCanvas()
    if (!canvas) return
    const handler = () => readProps()
    canvas.on('object:modified', handler)
    canvas.on('object:moving', handler)
    canvas.on('object:scaling', handler)
    canvas.on('object:rotating', handler)
    return () => {
      if (!canvas) return
      canvas.off('object:modified', handler)
      canvas.off('object:moving', handler)
      canvas.off('object:scaling', handler)
      canvas.off('object:rotating', handler)
    }
  }, [readProps])

  const updateProp = (key, value) => {
    const canvas = getCanvas()
    if (!canvas || !selectedLayerId) return
    const obj = canvas.getObjects().find(o => o.id === selectedLayerId)
    if (!obj) return

    switch (key) {
      case 'name':
        obj.name = value
        break
      case 'left':
        obj.set('left', Number(value))
        break
      case 'top':
        obj.set('top', Number(value))
        break
      case 'width':
        obj.set('scaleX', Number(value) / obj.width)
        break
      case 'height':
        obj.set('scaleY', Number(value) / obj.height)
        break
      case 'angle':
        obj.set('angle', Number(value))
        break
      case 'opacity':
        obj.set('opacity', Number(value) / 100)
        break
      case 'text':
        obj.set('text', value)
        break
      case 'fontSize':
        obj.set('fontSize', Number(value))
        break
      case 'fontFamily':
        obj.set('fontFamily', value)
        break
      case 'fill':
        obj.set('fill', value)
        break
      case 'textAlign':
        obj.set('textAlign', value)
        break
      case 'fontWeight':
        obj.set('fontWeight', value === 'bold' ? 'bold' : 'normal')
        break
      case 'fontStyle':
        obj.set('fontStyle', value === 'italic' ? 'italic' : 'normal')
        break
      case 'stroke':
        obj.set('stroke', value)
        break
      case 'strokeWidth':
        obj.set('strokeWidth', Number(value))
        break
      case 'slotIndex':
        obj.slotIndex = Number(value)
        obj.name = `Photo ${Number(value) + 1}`
        break
      default:
        obj.set(key, value)
    }

    obj.setCoords()
    canvas.renderAll()
    readProps()
  }

  if (!props) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-white/10">
          <h3 className="text-xs font-bold text-brand-text/60 uppercase tracking-wider">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-brand-text/20 text-xs">Select a layer</p>
        </div>
      </div>
    )
  }

  const inputClass = 'w-full px-2 py-1 bg-brand-primary border border-white/10 rounded text-xs text-brand-text focus:border-brand-secondary outline-none'
  const labelClass = 'text-[10px] text-brand-text/40 uppercase tracking-wider'
  const rowClass = 'flex items-center gap-2'

  const isText = props.type === 'text' || props.type === 'i-text'
  const isSlot = props.layerRole === 'photo-slot'

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/10">
        <h3 className="text-xs font-bold text-brand-text/60 uppercase tracking-wider">Properties</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {/* Name */}
        <div>
          <label className={labelClass}>Name</label>
          <input
            className={inputClass}
            value={props.name}
            onChange={(e) => updateProp('name', e.target.value)}
          />
        </div>

        {/* Position */}
        <div>
          <label className={labelClass}>Position</label>
          <div className={rowClass}>
            <div className="flex-1">
              <span className="text-[9px] text-brand-text/30">X</span>
              <input
                type="number"
                className={inputClass}
                value={props.left}
                onChange={(e) => updateProp('left', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <span className="text-[9px] text-brand-text/30">Y</span>
              <input
                type="number"
                className={inputClass}
                value={props.top}
                onChange={(e) => updateProp('top', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Size */}
        <div>
          <label className={labelClass}>Size</label>
          <div className={rowClass}>
            <div className="flex-1">
              <span className="text-[9px] text-brand-text/30">W</span>
              <input
                type="number"
                className={inputClass}
                value={props.width}
                onChange={(e) => updateProp('width', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <span className="text-[9px] text-brand-text/30">H</span>
              <input
                type="number"
                className={inputClass}
                value={props.height}
                onChange={(e) => updateProp('height', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Rotate & Opacity */}
        <div className={rowClass}>
          <div className="flex-1">
            <label className={labelClass}>Rotate</label>
            <input
              type="number"
              className={inputClass}
              value={props.angle}
              onChange={(e) => updateProp('angle', e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className={labelClass}>Opacity %</label>
            <input
              type="number"
              min="0"
              max="100"
              className={inputClass}
              value={props.opacity}
              onChange={(e) => updateProp('opacity', e.target.value)}
            />
          </div>
        </div>

        {/* Photo Slot specific */}
        {isSlot && (
          <>
            <div className="w-full h-px bg-white/10" />
            <div>
              <label className={labelClass}>Slot Index (Photo #)</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={props.slotIndex}
                onChange={(e) => updateProp('slotIndex', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Slot Fill</label>
              <input
                type="color"
                className="w-8 h-6 cursor-pointer bg-transparent border-0"
                value={props.fill?.startsWith('#') ? props.fill : '#cccccc'}
                onChange={(e) => updateProp('fill', e.target.value + '40')}
              />
            </div>
          </>
        )}

        {/* Text specific */}
        {isText && (
          <>
            <div className="w-full h-px bg-white/10" />

            {/* Text content (only for static text) */}
            {props.layerRole === 'static-text' && (
              <div>
                <label className={labelClass}>Text</label>
                <input
                  className={inputClass}
                  value={props.text}
                  onChange={(e) => updateProp('text', e.target.value)}
                />
              </div>
            )}

            {/* Font family */}
            <div>
              <label className={labelClass}>Font</label>
              <select
                className={inputClass}
                value={props.fontFamily}
                onChange={(e) => updateProp('fontFamily', e.target.value)}
              >
                {['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Impact', 'Comic Sans MS'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Font size */}
            <div>
              <label className={labelClass}>Font Size</label>
              <input
                type="number"
                min="8"
                max="200"
                className={inputClass}
                value={props.fontSize}
                onChange={(e) => updateProp('fontSize', e.target.value)}
              />
            </div>

            {/* Color */}
            <div>
              <label className={labelClass}>Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="w-8 h-6 cursor-pointer bg-transparent border-0"
                  value={props.fill}
                  onChange={(e) => updateProp('fill', e.target.value)}
                />
                <input
                  className={inputClass}
                  value={props.fill}
                  onChange={(e) => updateProp('fill', e.target.value)}
                />
              </div>
            </div>

            {/* Text Align */}
            <div>
              <label className={labelClass}>Align</label>
              <div className="flex gap-1">
                {['left', 'center', 'right'].map(a => (
                  <button
                    key={a}
                    onClick={() => updateProp('textAlign', a)}
                    className={`flex-1 px-2 py-1 text-[10px] rounded border transition ${
                      props.textAlign === a
                        ? 'bg-brand-secondary border-brand-secondary text-white'
                        : 'bg-brand-surface border-white/10 text-brand-text/60 hover:border-white/30'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Bold / Italic */}
            <div className="flex gap-1">
              <button
                onClick={() => updateProp('fontWeight', props.fontWeight === 'bold' ? 'normal' : 'bold')}
                className={`flex-1 px-2 py-1 text-xs font-bold rounded border transition ${
                  props.fontWeight === 'bold'
                    ? 'bg-brand-secondary border-brand-secondary text-white'
                    : 'bg-brand-surface border-white/10 text-brand-text/60 hover:border-white/30'
                }`}
              >
                B
              </button>
              <button
                onClick={() => updateProp('fontStyle', props.fontStyle === 'italic' ? 'normal' : 'italic')}
                className={`flex-1 px-2 py-1 text-xs italic rounded border transition ${
                  props.fontStyle === 'italic'
                    ? 'bg-brand-secondary border-brand-secondary text-white'
                    : 'bg-brand-surface border-white/10 text-brand-text/60 hover:border-white/30'
                }`}
              >
                I
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
