import useAppStore from '../store/useAppStore'
import DecoElements, { DecoArrow } from './DecoElements'

/**
 * SplitLayout — wrapper for split-screen layout on user pages.
 *
 * When layout is "split":
 *   Left panel  = logo, page title, decorative elements, arrow
 *   Right panel = {children} (page content)
 *
 * When layout is "centered" or on pages that opt-out:
 *   Renders children directly without split.
 *
 * Props:
 *   - title: string — page title for left panel
 *   - subtitle: string — optional subtitle
 *   - children: ReactNode — page content (right panel)
 *   - forceCentered: boolean — override to always render centered
 */
export default function SplitLayout({ title, subtitle, children, forceCentered = false }) {
  const branding = useAppStore((s) => s.branding)

  const isSplit = branding.layoutTemplate === 'split' && !forceCentered

  if (!isSplit) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* ── Left Panel ──────────────────────────────────────── */}
      <div className="w-[35%] min-w-[280px] max-w-[420px] flex-shrink-0 flex flex-col justify-between p-8 border-r border-white/10 relative overflow-hidden">
        {/* Logo */}
        {branding.logoDataUrl && (
          <div className="mb-auto">
            <img
              src={branding.logoDataUrl}
              alt="Logo"
              className="h-10 w-auto object-contain opacity-80"
            />
          </div>
        )}

        {/* Center content: deco + title */}
        <div className="flex-1 flex flex-col justify-center gap-4">
          {/* Decorative elements */}
          <DecoElements />

          {/* Title */}
          <h1 className="text-4xl font-bold text-brand-text tracking-tight leading-tight uppercase">
            {title}
          </h1>

          {subtitle && (
            <p className="text-brand-text/50 text-sm tracking-wide">{subtitle}</p>
          )}

          {/* Arrow decoration */}
          <DecoArrow preset={branding.decorativePreset} />
        </div>

        {/* Bottom spacer */}
        <div className="mt-auto" />
      </div>

      {/* ── Right Panel (content) ───────────────────────────── */}
      <div className="flex-1 min-w-0 h-screen overflow-y-auto flex flex-col">
        {children}
      </div>
    </div>
  )
}
