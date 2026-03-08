import { useState, useEffect } from 'react'
import {
  PAPER_PRESETS,
  getPresetDimensions,
  pxToInches,
  pxToMm,
  inchesToPx,
  mmToPx,
} from '../../../utils/fabricHelpers'

const UNIT_OPTIONS = [
  { value: 'pixels', label: 'Pixels' },
  { value: 'inches', label: 'Inches' },
  { value: 'mm', label: 'Millimeters' },
]

const DPI_OPTIONS = [
  { value: 300, label: '300 dpi' },
  { value: 600, label: '600 dpi' },
]

// Portrait / Landscape icons
const PortraitIcon = ({ active }) => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"
    stroke={active ? 'white' : 'currentColor'} strokeWidth="2">
    <rect x="5" y="2" width="14" height="20" rx="2" />
  </svg>
)
const LandscapeIcon = ({ active }) => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"
    stroke={active ? 'white' : 'currentColor'} strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="2" />
  </svg>
)

// ─── Component ────────────────────────────────────────────────────────────────
export default function LayoutPanel({ layout, onLayoutChange }) {
  const {
    paperSize = '4x6',
    orientation = 'vertical',
    dpi = 300,
    widthPx = 1200,
    heightPx = 1800,
  } = layout

  const [viewUnit, setViewUnit] = useState('pixels')
  const [widthInput, setWidthInput] = useState('')
  const [heightInput, setHeightInput] = useState('')

  useEffect(() => {
    setWidthInput(formatValue(widthPx))
    setHeightInput(formatValue(heightPx))
  }, [widthPx, heightPx, viewUnit, dpi])

  function formatValue(px) {
    if (viewUnit === 'inches') return (pxToInches(px, dpi)).toFixed(2)
    if (viewUnit === 'mm') return (pxToMm(px, dpi)).toFixed(1)
    return String(px)
  }

  function displayToPx(val) {
    const num = parseFloat(val)
    if (isNaN(num) || num <= 0) return null
    if (viewUnit === 'inches') return inchesToPx(num, dpi)
    if (viewUnit === 'mm') return mmToPx(num, dpi)
    return Math.round(num)
  }

  function detectPreset(w, h, ori, currentDpi) {
    for (const p of PAPER_PRESETS) {
      if (!p.wIn) continue
      const dims = getPresetDimensions(p.id, ori, currentDpi)
      if (dims && dims.width === w && dims.height === h) return p.id
    }
    return 'custom'
  }

  const handlePaperSizeChange = (presetId) => {
    if (presetId === 'custom') {
      onLayoutChange({ ...layout, paperSize: 'custom' })
      return
    }
    const dims = getPresetDimensions(presetId, orientation, dpi)
    if (dims) {
      onLayoutChange({ ...layout, paperSize: presetId, widthPx: dims.width, heightPx: dims.height })
    }
  }

  const handleOrientationChange = (newOri) => {
    if (newOri === orientation) return
    onLayoutChange({
      ...layout,
      orientation: newOri,
      widthPx: heightPx,
      heightPx: widthPx,
      paperSize: detectPreset(heightPx, widthPx, newOri, dpi),
    })
  }

  const handleDpiChange = (newDpi) => {
    newDpi = Number(newDpi)
    const wIn = pxToInches(widthPx, dpi)
    const hIn = pxToInches(heightPx, dpi)
    const newW = inchesToPx(wIn, newDpi)
    const newH = inchesToPx(hIn, newDpi)
    onLayoutChange({
      ...layout,
      dpi: newDpi,
      widthPx: newW,
      heightPx: newH,
      paperSize: detectPreset(newW, newH, orientation, newDpi),
    })
  }

  const handleWidthCommit = () => {
    const px = displayToPx(widthInput)
    if (!px || px === widthPx) return
    onLayoutChange({ ...layout, widthPx: px, paperSize: detectPreset(px, heightPx, orientation, dpi) })
  }

  const handleHeightCommit = () => {
    const px = displayToPx(heightInput)
    if (!px || px === heightPx) return
    onLayoutChange({ ...layout, heightPx: px, paperSize: detectPreset(widthPx, px, orientation, dpi) })
  }

  const unitSuffix = viewUnit === 'inches' ? '"' : viewUnit === 'mm' ? 'mm' : 'px'

  const selectClass = 'w-full px-2 py-1.5 bg-brand-primary border border-white/10 rounded text-xs text-brand-text focus:border-brand-secondary outline-none cursor-pointer transition-colors'
  const inputClass = 'w-full px-2 py-1 bg-brand-primary border border-white/10 rounded text-xs text-brand-text focus:border-brand-secondary outline-none transition-colors'
  const labelClass = 'block text-[10px] text-brand-text/35 uppercase tracking-wider mb-1'

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
        <h3 className="text-[10px] font-semibold text-brand-text/35 uppercase tracking-widest">Canvas</h3>
      </div>

      <div className="px-3 py-2.5 space-y-3">

        {/* View unit */}
        <div>
          <label className={labelClass}>View In</label>
          <select className={selectClass} value={viewUnit} onChange={(e) => setViewUnit(e.target.value)}>
            {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>

        {/* Paper size */}
        <div>
          <label className={labelClass}>Paper Size</label>
          <select className={selectClass} value={paperSize} onChange={(e) => handlePaperSizeChange(e.target.value)}>
            {PAPER_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>

        {/* Resolution */}
        <div>
          <label className={labelClass}>Resolution</label>
          <select className={selectClass} value={dpi} onChange={(e) => handleDpiChange(e.target.value)}>
            {DPI_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        {/* Orientation — icon toggle */}
        <div>
          <label className={labelClass}>Orientation</label>
          <div className="flex gap-1.5">
            <button
              onClick={() => handleOrientationChange('vertical')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded border text-xs transition-colors ${
                orientation === 'vertical'
                  ? 'bg-brand-secondary border-brand-secondary text-white'
                  : 'border-white/10 text-brand-text/50 hover:border-white/25'
              }`}
            >
              <PortraitIcon active={orientation === 'vertical'} />
              Portrait
            </button>
            <button
              onClick={() => handleOrientationChange('horizontal')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded border text-xs transition-colors ${
                orientation === 'horizontal'
                  ? 'bg-brand-secondary border-brand-secondary text-white'
                  : 'border-white/10 text-brand-text/50 hover:border-white/25'
              }`}
            >
              <LandscapeIcon active={orientation === 'horizontal'} />
              Landscape
            </button>
          </div>
        </div>

        {/* Width / Height */}
        <div>
          <label className={labelClass}>Dimensions</label>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <div className="text-[9px] text-brand-text/25 mb-0.5">Width</div>
              <div className="relative">
                <input
                  type="text"
                  className={inputClass}
                  value={widthInput}
                  onChange={(e) => setWidthInput(e.target.value)}
                  onBlur={handleWidthCommit}
                  onKeyDown={(e) => e.key === 'Enter' && handleWidthCommit()}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-brand-text/25 pointer-events-none">
                  {unitSuffix}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[9px] text-brand-text/25 mb-0.5">Height</div>
              <div className="relative">
                <input
                  type="text"
                  className={inputClass}
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  onBlur={handleHeightCommit}
                  onKeyDown={(e) => e.key === 'Enter' && handleHeightCommit()}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-brand-text/25 pointer-events-none">
                  {unitSuffix}
                </span>
              </div>
            </div>
          </div>

          {/* Pixel info when not in pixel mode */}
          {viewUnit !== 'pixels' && (
            <p className="text-[9px] text-brand-text/20 font-mono mt-1.5">
              {widthPx} × {heightPx} px
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
