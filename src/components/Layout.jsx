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
    } else if (branding.bgColor) {
      wrapperStyle.backgroundColor = branding.bgColor
    }
  }

  const hasCustomBg = isUserRoute && (branding.bgImageDataUrl || branding.bgColor)

  return (
    <div
      className={`min-h-screen w-full text-white relative ${hasCustomBg ? '' : 'bg-black'}`}
      style={wrapperStyle}
    >
      {isUserRoute && (
        <button
          onClick={handleExit}
          className="absolute top-3 right-4 z-50 px-3 py-1 text-xs text-white/30 border border-white/10 rounded-lg hover:text-white/70 hover:border-white/30 transition select-none"
        >
          ✕ Exit
        </button>
      )}

      <Outlet />
    </div>
  )
}
