import useAppStore from '../store/useAppStore'

/**
 * Decorative elements based on branding preset.
 * Renders accent icons, lines, and shapes.
 *
 * Presets:
 *  - "none"   → nothing rendered
 *  - "modern" → star ✦, sparkle ✸, thin line (CHRONE-style)
 *  - "bold"   → bracket borders, double arrow, circle dots
 */
export default function DecoElements({ className = '' }) {
  const preset = useAppStore((s) => s.branding.decorativePreset)

  if (preset === 'none' || !preset) return null

  if (preset === 'modern') {
    return (
      <div className={`flex flex-col items-start gap-6 pointer-events-none select-none ${className}`}>
        {/* Star icon */}
        <span className="text-[var(--brand-secondary)] text-3xl leading-none">✦</span>

        {/* Thin vertical line */}
        <div className="w-px h-16 bg-[var(--brand-secondary)]/40" />

        {/* Sparkle icon */}
        <span className="text-[var(--brand-secondary)] text-2xl leading-none">✸</span>

        {/* Another thin line */}
        <div className="w-px h-12 bg-[var(--brand-secondary)]/20" />
      </div>
    )
  }

  if (preset === 'bold') {
    return (
      <div className={`flex flex-col items-start gap-4 pointer-events-none select-none ${className}`}>
        {/* Corner bracket top */}
        <div className="w-8 h-8 border-l-2 border-t-2 border-[var(--brand-secondary)]" />

        {/* Dot row */}
        <div className="flex gap-2 ml-1">
          <div className="w-2 h-2 rounded-full bg-[var(--brand-secondary)]" />
          <div className="w-2 h-2 rounded-full bg-[var(--brand-secondary)]/60" />
          <div className="w-2 h-2 rounded-full bg-[var(--brand-secondary)]/30" />
        </div>

        {/* Vertical bar */}
        <div className="w-1 h-20 bg-[var(--brand-secondary)]/50 rounded-full ml-1" />

        {/* Corner bracket bottom */}
        <div className="w-8 h-8 border-r-2 border-b-2 border-[var(--brand-secondary)] self-end" />
      </div>
    )
  }

  return null
}

/**
 * Arrow decoration — used at the bottom of the left panel in split-screen.
 */
export function DecoArrow({ preset }) {
  if (!preset || preset === 'none') return null

  if (preset === 'modern') {
    return (
      <div className="pointer-events-none select-none text-[var(--brand-secondary)] text-4xl leading-none mt-4">
        →
      </div>
    )
  }

  if (preset === 'bold') {
    return (
      <div className="pointer-events-none select-none flex items-center gap-2 mt-4">
        <div className="w-12 h-0.5 bg-[var(--brand-secondary)]" />
        <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-[var(--brand-secondary)]" />
      </div>
    )
  }

  return null
}
