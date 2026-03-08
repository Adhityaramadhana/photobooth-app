import { useState, useEffect, useCallback } from 'react'

// ─── Small helpers ────────────────────────────────────────────────────────────
function SectionHeader({ label }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
      <span className="text-[9px] font-semibold text-brand-text/30 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/6" />
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="px-3 mb-2">
      {label && (
        <label className="block text-[10px] text-brand-text/35 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}
      {children}
    </div>
  )
}

const inp = 'w-full px-2 py-1 bg-brand-primary border border-white/10 rounded text-xs text-brand-text focus:border-brand-secondary outline-none transition-colors'

function NumInput({ label, sub, value, onChange, min, max, className = '' }) {
  return (
    <div className={className}>
      {(label || sub) && (
        <div className="text-[9px] text-brand-text/25 mb-0.5">{sub || label}</div>
      )}
      <input
        type="number"
        className={inp}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
      />
    </div>
  )
}

// Empty state icon
const IconSelect = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9" />
  </svg>
)

// ─── Component ────────────────────────────────────────────────────────────────
export default function PropertiesPanel({ canvasRef, selectedLayerId }) {
  const [props, setProps] = useState(null)

  const getCanvas = () => canvasRef.current?.getCanvas()

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
      case 'name': obj.name = value; break
      case 'left': obj.set('left', Number(value)); break
      case 'top': obj.set('top', Number(value)); break
      case 'width': obj.set('scaleX', Number(value) / obj.width); break
      case 'height': obj.set('scaleY', Number(value) / obj.height); break
      case 'angle': obj.set('angle', Number(value)); break
      case 'opacity': obj.set('opacity', Number(value) / 100); break
      case 'text': obj.set('text', value); break
      case 'fontSize': obj.set('fontSize', Number(value)); break
      case 'fontFamily': obj.set('fontFamily', value); break
      case 'fill': obj.set('fill', value); break
      case 'textAlign': obj.set('textAlign', value); break
      case 'fontWeight': obj.set('fontWeight', value === 'bold' ? 'bold' : 'normal'); break
      case 'fontStyle': obj.set('fontStyle', value === 'italic' ? 'italic' : 'normal'); break
      case 'stroke': obj.set('stroke', value); break
      case 'strokeWidth': obj.set('strokeWidth', Number(value)); break
      case 'slotIndex':
        obj.slotIndex = Number(value)
        obj.name = `Photo ${Number(value) + 1}`
        break
      default: obj.set(key, value)
    }

    obj.setCoords()
    canvas.renderAll()
    readProps()
  }

  // ── Empty state ──
  if (!props) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-white/8">
          <h3 className="text-[10px] font-semibold text-brand-text/35 uppercase tracking-widest">Properties</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-2.5 text-center px-4">
          <div className="text-brand-text/10">
            <IconSelect />
          </div>
          <p className="text-[10px] text-brand-text/20 leading-relaxed">
            Select a layer to<br />edit its properties
          </p>
        </div>
      </div>
    )
  }

  const isText = props.type === 'text' || props.type === 'i-text'
  const isSlot = props.layerRole === 'photo-slot'

  const selectClass = `${inp} cursor-pointer`

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-3 py-2 border-b border-white/8 flex-shrink-0">
        <h3 className="text-[10px] font-semibold text-brand-text/35 uppercase tracking-widest">Properties</h3>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">

        {/* Layer name */}
        <SectionHeader label="Layer" />
        <Field label="Name">
          <input
            className={inp}
            value={props.name}
            onChange={(e) => updateProp('name', e.target.value)}
          />
        </Field>

        {/* Transform */}
        <SectionHeader label="Transform" />

        <Field label="Position">
          <div className="grid grid-cols-2 gap-1.5">
            <NumInput sub="X" value={props.left} onChange={(e) => updateProp('left', e.target.value)} />
            <NumInput sub="Y" value={props.top} onChange={(e) => updateProp('top', e.target.value)} />
          </div>
        </Field>

        <Field label="Size">
          <div className="grid grid-cols-2 gap-1.5">
            <NumInput sub="W" value={props.width} onChange={(e) => updateProp('width', e.target.value)} />
            <NumInput sub="H" value={props.height} onChange={(e) => updateProp('height', e.target.value)} />
          </div>
        </Field>

        <div className="px-3 mb-2">
          <div className="grid grid-cols-2 gap-1.5">
            <NumInput label="Rotate°" value={props.angle} onChange={(e) => updateProp('angle', e.target.value)} />
            <NumInput label="Opacity%" value={props.opacity} onChange={(e) => updateProp('opacity', e.target.value)} min={0} max={100} />
          </div>
        </div>

        {/* Photo slot */}
        {isSlot && (
          <>
            <SectionHeader label="Photo Slot" />
            <Field label="Photo Order (index)">
              <input
                type="number"
                min="0"
                className={inp}
                value={props.slotIndex}
                onChange={(e) => updateProp('slotIndex', e.target.value)}
              />
            </Field>
          </>
        )}

        {/* Text */}
        {isText && (
          <>
            <SectionHeader label="Text" />

            {props.layerRole === 'static-text' && (
              <Field label="Content">
                <input
                  className={inp}
                  value={props.text}
                  onChange={(e) => updateProp('text', e.target.value)}
                />
              </Field>
            )}

            <Field label="Font Family">
              <select
                className={selectClass}
                value={props.fontFamily}
                onChange={(e) => updateProp('fontFamily', e.target.value)}
              >
                {['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Impact', 'Comic Sans MS'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </Field>

            <div className="px-3 mb-2 grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-[10px] text-brand-text/35 uppercase tracking-wider mb-1">Size</label>
                <input
                  type="number" min="8" max="400"
                  className={inp}
                  value={props.fontSize}
                  onChange={(e) => updateProp('fontSize', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] text-brand-text/35 uppercase tracking-wider mb-1">Color</label>
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    className="w-7 h-[26px] cursor-pointer rounded border border-white/10 bg-transparent flex-shrink-0"
                    value={props.fill?.startsWith('#') ? props.fill : '#333333'}
                    onChange={(e) => updateProp('fill', e.target.value)}
                  />
                  <input
                    className={`${inp} min-w-0 font-mono text-[10px]`}
                    value={props.fill}
                    onChange={(e) => updateProp('fill', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Field label="Style">
              <div className="flex gap-1">
                {/* Bold */}
                <button
                  onClick={() => updateProp('fontWeight', props.fontWeight === 'bold' ? 'normal' : 'bold')}
                  className={`flex-1 py-1 text-xs font-bold rounded border transition-colors ${
                    props.fontWeight === 'bold'
                      ? 'bg-brand-secondary border-brand-secondary text-white'
                      : 'border-white/10 text-brand-text/45 hover:border-white/25'
                  }`}
                >
                  B
                </button>
                {/* Italic */}
                <button
                  onClick={() => updateProp('fontStyle', props.fontStyle === 'italic' ? 'normal' : 'italic')}
                  className={`flex-1 py-1 text-xs italic rounded border transition-colors ${
                    props.fontStyle === 'italic'
                      ? 'bg-brand-secondary border-brand-secondary text-white'
                      : 'border-white/10 text-brand-text/45 hover:border-white/25'
                  }`}
                >
                  I
                </button>
                {/* Align left */}
                <button
                  onClick={() => updateProp('textAlign', 'left')}
                  className={`flex-1 py-1 rounded border transition-colors text-[11px] ${
                    props.textAlign === 'left'
                      ? 'bg-brand-secondary/20 border-brand-secondary/50 text-brand-secondary'
                      : 'border-white/10 text-brand-text/30 hover:border-white/25'
                  }`}
                  title="Align left"
                >
                  ⇤
                </button>
                {/* Align center */}
                <button
                  onClick={() => updateProp('textAlign', 'center')}
                  className={`flex-1 py-1 rounded border transition-colors text-[11px] ${
                    props.textAlign === 'center'
                      ? 'bg-brand-secondary/20 border-brand-secondary/50 text-brand-secondary'
                      : 'border-white/10 text-brand-text/30 hover:border-white/25'
                  }`}
                  title="Align center"
                >
                  ≡
                </button>
                {/* Align right */}
                <button
                  onClick={() => updateProp('textAlign', 'right')}
                  className={`flex-1 py-1 rounded border transition-colors text-[11px] ${
                    props.textAlign === 'right'
                      ? 'bg-brand-secondary/20 border-brand-secondary/50 text-brand-secondary'
                      : 'border-white/10 text-brand-text/30 hover:border-white/25'
                  }`}
                  title="Align right"
                >
                  ⇥
                </button>
              </div>
            </Field>
          </>
        )}
      </div>
    </div>
  )
}
