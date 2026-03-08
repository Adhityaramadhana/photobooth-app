import { FabricObject } from 'fabric'

// Reset origin to left/top for predictable positioning
FabricObject.ownDefaults.originX = 'left'
FabricObject.ownDefaults.originY = 'top'

// Register custom properties so they survive serialization
FabricObject.customProperties = [
  'id',
  'name',
  'layerRole',    // 'background' | 'photo-slot' | 'overlay' | 'static-text' | 'dynamic-text'
  'slotIndex',    // for photo-slot layers
  'dynamicField', // for dynamic-text: 'date', 'time', 'session_id', 'studio_name'
  'locked',       // editor lock state
]

// Paper size presets (inches-based, DPI-independent)
// Width is always the shorter side, height the longer — orientation handles swapping
export const PAPER_PRESETS = [
  { id: '2x6',  wIn: 2, hIn: 6,  label: '2 x 6' },
  { id: '4x6',  wIn: 4, hIn: 6,  label: '4 x 6' },
  { id: '4x8',  wIn: 4, hIn: 8,  label: '4 x 8' },
  { id: '5x7',  wIn: 5, hIn: 7,  label: '5 x 7' },
  { id: '6x8',  wIn: 6, hIn: 8,  label: '6 x 8' },
  { id: '6x9',  wIn: 6, hIn: 9,  label: '6 x 9' },
  { id: '8x10', wIn: 8, hIn: 10, label: '8 x 10' },
  { id: 'custom', wIn: null, hIn: null, label: 'Custom' },
]

// Convert inches to pixels at given DPI
export function inchesToPx(inches, dpi = 300) {
  return Math.round(inches * dpi)
}

// Convert pixels to inches at given DPI
export function pxToInches(px, dpi = 300) {
  return px / dpi
}

// Convert pixels to mm at given DPI
export function pxToMm(px, dpi = 300) {
  return (px / dpi) * 25.4
}

// Convert mm to pixels at given DPI
export function mmToPx(mm, dpi = 300) {
  return Math.round((mm / 25.4) * dpi)
}

// Get pixel dimensions for a preset + orientation + DPI
export function getPresetDimensions(presetId, orientation = 'vertical', dpi = 300) {
  const preset = PAPER_PRESETS.find(p => p.id === presetId)
  if (!preset || !preset.wIn) return null
  const shortSide = inchesToPx(preset.wIn, dpi)
  const longSide = inchesToPx(preset.hIn, dpi)
  return orientation === 'vertical'
    ? { width: shortSide, height: longSide }
    : { width: longSide, height: shortSide }
}

// Legacy PAPER_SIZES for backward compat (used by EditorCanvas)
export const PAPER_SIZES = Object.fromEntries(
  PAPER_PRESETS.filter(p => p.wIn).map(p => [
    p.id,
    { width: inchesToPx(p.wIn), height: inchesToPx(p.hIn), label: p.label }
  ])
)

export const CUSTOM_PROPS = ['id', 'name', 'layerRole', 'slotIndex', 'dynamicField', 'locked']

// Generate unique ID
export function uid(prefix = 'obj') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

// Extract layers array from canvas for saving
export function canvasToLayers(canvas) {
  return canvas.getObjects().map(obj => {
    const base = obj.toObject(CUSTOM_PROPS)
    return {
      ...base,
      id: obj.id,
      name: obj.name,
      layerRole: obj.layerRole,
      slotIndex: obj.slotIndex ?? null,
      dynamicField: obj.dynamicField ?? null,
      locked: obj.locked ?? false,
      // Override with actual rendered dimensions (accounts for scaleX/scaleY)
      width: Math.round(obj.getScaledWidth()),
      height: Math.round(obj.getScaledHeight()),
      left: Math.round(obj.left),
      top: Math.round(obj.top),
    }
  })
}

// Build template config for saving
export function buildTemplateConfig(canvas, meta) {
  return {
    id: meta.id,
    name: meta.name,
    version: 2,
    canvas: {
      width: canvas.width,
      height: canvas.height,
      paperSize: meta.paperSize || '4x6',
      dpi: meta.dpi || 300,
      orientation: meta.orientation || 'vertical',
      backgroundColor: canvas.backgroundColor || '#ffffff',
    },
    layers: canvasToLayers(canvas),
    // Full fabric JSON for exact restoration
    fabricJson: canvas.toJSON(CUSTOM_PROPS),
  }
}

// Get next slot index based on existing slots
export function getNextSlotIndex(canvas) {
  let max = -1
  canvas.getObjects().forEach(obj => {
    if (obj.layerRole === 'photo-slot' && typeof obj.slotIndex === 'number') {
      max = Math.max(max, obj.slotIndex)
    }
  })
  return max + 1
}
