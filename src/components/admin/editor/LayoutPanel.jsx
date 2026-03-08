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

  // Sync display values when layout changes
  useEffect(() => {
    setWidthInput(formatValue(widthPx))
    setHeightInput(formatValue(heightPx))
  }, [widthPx, heightPx, viewUnit, dpi])

  // Convert px to display unit
  function formatValue(px) {
    if (viewUnit === 'inches') return (pxToInches(px, dpi)).toFixed(2)
    if (viewUnit === 'mm') return (pxToMm(px, dpi)).toFixed(1)
    return String(px)
  }

  // Convert display unit input back to px
  function displayToPx(val) {
    const num = parseFloat(val)
    if (isNaN(num) || num <= 0) return null
    if (viewUnit === 'inches') return inchesToPx(num, dpi)
    if (viewUnit === 'mm') return mmToPx(num, dpi)
    return Math.round(num)
  }

  // Detect which preset matches current dimensions
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
      onLayoutChange({
        ...layout,
        paperSize: presetId,
        widthPx: dims.width,
        heightPx: dims.height,
      })
    }
  }

  const handleOrientationChange = (newOri) => {
    if (newOri === orientation) return
    // Swap width and height
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
    // Keep physical size, recalculate pixels
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
    onLayoutChange({
      ...layout,
      widthPx: px,
      paperSize: detectPreset(px, heightPx, orientation, dpi),
    })
  }

  const handleHeightCommit = () => {
    const px = displayToPx(heightInput)
    if (!px || px === heightPx) return
    onLayoutChange({
      ...layout,
      heightPx: px,
      paperSize: detectPreset(widthPx, px, orientation, dpi),
    })
  }

  const unitSuffix = viewUnit === 'inches' ? '"' : viewUnit === 'mm' ? 'mm' : 'px'

  const inputClass = 'w-full px-2 py-1 bg-brand-primary border border-white/10 rounded text-xs text-brand-text focus:border-brand-secondary outline-none'
  const labelClass = 'text-[10px] text-brand-text/40 uppercase tracking-wider mb-0.5'
  const selectClass = 'w-full px-2 py-1.5 bg-brand-primary border border-white/10 rounded text-xs text-brand-text focus:border-brand-secondary outline-none cursor-pointer'

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 border-b border-white/10">
        <h3 className="text-xs font-bold text-brand-text/60 uppercase tracking-wider">Layout</h3>
      </div>

      <div className="px-3 py-2 space-y-3">
        {/* View Dimension In */}
        <div>
          <label className={labelClass}>View Dimension In</label>
          <select
            className={selectClass}
            value={viewUnit}
            onChange={(e) => setViewUnit(e.target.value)}
          >
            {UNIT_OPTIONS.map(u => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>

        {/* Paper Size */}
        <div>
          <label className={labelClass}>Paper Size</label>
          <select
            className={selectClass}
            value={paperSize}
            onChange={(e) => handlePaperSizeChange(e.target.value)}
          >
            {PAPER_PRESETS.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Resolution */}
        <div>
          <label className={labelClass}>Resolution</label>
          <select
            className={selectClass}
            value={dpi}
            onChange={(e) => handleDpiChange(e.target.value)}
          >
            {DPI_OPTIONS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        {/* Orientation */}
        <div>
          <label className={labelClass}>Orientation</label>
          <div className="flex gap-1">
            <button
              onClick={() => handleOrientationChange('vertical')}
              className={`flex-1 px-2 py-1.5 text-[11px] rounded border transition ${
                orientation === 'vertical'
                  ? 'bg-brand-secondary border-brand-secondary text-white'
                  : 'bg-brand-primary border-white/10 text-brand-text/60 hover:border-white/30'
              }`}
            >
              Vertical
            </button>
            <button
              onClick={() => handleOrientationChange('horizontal')}
              className={`flex-1 px-2 py-1.5 text-[11px] rounded border transition ${
                orientation === 'horizontal'
                  ? 'bg-brand-secondary border-brand-secondary text-white'
                  : 'bg-brand-primary border-white/10 text-brand-text/60 hover:border-white/30'
              }`}
            >
              Horizontal
            </button>
          </div>
        </div>

        {/* Width / Height */}
        <div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Width</label>
              <div className="relative">
                <input
                  type="text"
                  className={inputClass}
                  value={widthInput}
                  onChange={(e) => setWidthInput(e.target.value)}
                  onBlur={handleWidthCommit}
                  onKeyDown={(e) => e.key === 'Enter' && handleWidthCommit()}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-brand-text/30">
                  {unitSuffix}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <label className={labelClass}>Height</label>
              <div className="relative">
                <input
                  type="text"
                  className={inputClass}
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  onBlur={handleHeightCommit}
                  onKeyDown={(e) => e.key === 'Enter' && handleHeightCommit()}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-brand-text/30">
                  {unitSuffix}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actual pixel dimensions info */}
        {viewUnit !== 'pixels' && (
          <p className="text-[9px] text-brand-text/25 font-mono">
            {widthPx} x {heightPx} px
          </p>
        )}
      </div>
    </div>
  )
}
