import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'

const USER_ROUTES = ['/idle', '/payment', '/select-frame', '/photo-session', '/processing', '/result']

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
    wrapperStyle['--brand-secondary'] = branding.primaryColor || '#e94560'
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
