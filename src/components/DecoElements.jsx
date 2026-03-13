import useAppStore from '../store/useAppStore'

/**
 * Decorative elements based on branding preset.
 * Renders accent icons, lines, and shapes.
 * Uses custom decorativeColor if set, otherwise falls back to accent color.
 *
 * Presets:
 *  - "none"   → nothing rendered
 *  - "modern" → star ✦, sparkle ✸, thin line (CHRONE-style)
 *  - "bold"   → bracket borders, double arrow, circle dots
 */
export default function DecoElements({ className = '' }) {
  const preset = useAppStore((s) => s.branding.decorativePreset)
  const decoColor = useAppStore((s) => s.branding.decorativeColor)

  if (preset === 'none' || !preset) return null

  // Use custom deco color or fall back to accent color via CSS variable
  const color = decoColor || 'var(--brand-secondary)'

  if (preset === 'modern') {
    return (
      <div className={`flex flex-col items-start gap-6 pointer-events-none select-none ${className}`}>
        {/* Star icon */}
        <span className="text-3xl leading-none" style={{ color }}>✦</span>

        {/* Thin vertical line */}
        <div className="w-px h-16" style={{ backgroundColor: color, opacity: 0.4 }} />

        {/* Sparkle icon */}
        <span className="text-2xl leading-none" style={{ color }}>✸</span>

        {/* Another thin line */}
        <div className="w-px h-12" style={{ backgroundColor: color, opacity: 0.2 }} />
      </div>
    )
  }

  if (preset === 'bold') {
    return (
      <div className={`flex flex-col items-start gap-4 pointer-events-none select-none ${className}`}>
        {/* Corner bracket top */}
        <div className="w-8 h-8" style={{ borderLeft: `2px solid ${color}`, borderTop: `2px solid ${color}` }} />

        {/* Dot row */}
        <div className="flex gap-2 ml-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, opacity: 0.6 }} />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, opacity: 0.3 }} />
        </div>

        {/* Vertical bar */}
        <div className="w-1 h-20 rounded-full ml-1" style={{ backgroundColor: color, opacity: 0.5 }} />

        {/* Corner bracket bottom */}
        <div className="w-8 h-8 self-end" style={{ borderRight: `2px solid ${color}`, borderBottom: `2px solid ${color}` }} />
      </div>
    )
  }

  return null
}

/**
 * Arrow decoration — used at the bottom of the left panel in split-screen.
 */
export function DecoArrow({ preset }) {
  const decoColor = useAppStore((s) => s.branding.decorativeColor)

  if (!preset || preset === 'none') return null

  const color = decoColor || 'var(--brand-secondary)'

  if (preset === 'modern') {
    return (
      <div className="pointer-events-none select-none text-4xl leading-none mt-4" style={{ color }}>
        →
      </div>
    )
  }

  if (preset === 'bold') {
    return (
      <div className="pointer-events-none select-none flex items-center gap-2 mt-4">
        <div className="w-12 h-0.5" style={{ backgroundColor: color }} />
        <div
          className="w-0 h-0"
          style={{
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderLeft: `10px solid ${color}`,
          }}
        />
      </div>
    )
  }

  return null
}
