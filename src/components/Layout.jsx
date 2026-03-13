import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'

const USER_ROUTES = ['/idle', '/payment', '/select-frame', '/photo-session', '/processing', '/result']

function getContrastText(hex) {
  if (!hex || hex.length < 7) return '#ffffff'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1a1a2e' : '#ffffff'
}

// Pages where persistent logo should NOT appear (already has its own logo display)
const SKIP_LOGO_ROUTES = ['/idle']

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const clearSession = useAppStore((s) => s.clearSession)
  const branding = useAppStore((s) => s.branding)

  const isUserRoute = USER_ROUTES.includes(location.pathname)

  const handleExit = () => {
    clearSession()
    document.exitFullscreen?.()
    navigate('/')
  }

  const wrapperStyle = {}
  if (isUserRoute) {
    const accent = branding.primaryColor || '#e94560'
    wrapperStyle['--brand-secondary'] = accent
    wrapperStyle['--brand-secondary-text'] = getContrastText(accent)
    if (branding.bgImageDataUrl) {
      wrapperStyle.backgroundImage = `url(${branding.bgImageDataUrl})`
      wrapperStyle.backgroundSize = 'cover'
      wrapperStyle.backgroundPosition = 'center'
      wrapperStyle.backgroundRepeat = 'no-repeat'
    }
  }

  const hasCustomBg = isUserRoute && branding.bgImageDataUrl
  const showPersistentLogo =
    isUserRoute &&
    branding.showLogoPersistent &&
    branding.logoDataUrl &&
    !SKIP_LOGO_ROUTES.includes(location.pathname)
  const overlayOpacity = isUserRoute ? (branding.bgOverlayOpacity ?? 0) : 0

  return (
    <div
      className={`min-h-screen w-full text-white relative ${hasCustomBg ? '' : 'bg-black'}`}
      style={wrapperStyle}
    >
      {/* Dark overlay for better text readability over background images */}
      {overlayOpacity > 0 && (
        <div
          className="absolute inset-0 bg-black pointer-events-none z-[1]"
          style={{ opacity: overlayOpacity / 100 }}
        />
      )}

      {/* Persistent logo — top-left on all user pages (except idle) */}
      {showPersistentLogo && (
        <div className="absolute top-4 left-5 z-40 pointer-events-none select-none">
          <img
            src={branding.logoDataUrl}
            alt="Logo"
            className="h-8 w-auto object-contain opacity-70"
          />
        </div>
      )}

      {isUserRoute && (
        <button
          onClick={handleExit}
          className="absolute top-3 right-4 z-50 px-3 py-1 text-xs text-white/30 border border-white/10 rounded-lg hover:text-white/70 hover:border-white/30 transition select-none"
        >
          ✕ Exit
        </button>
      )}

      {/* Content wrapper — positioned above overlay */}
      <div className="relative z-[2] h-full min-h-screen">
        <Outlet />
      </div>
    </div>
  )
}

