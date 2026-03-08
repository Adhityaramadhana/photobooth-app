import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'

const USER_ROUTES = ['/idle', '/payment', '/select-frame', '/photo-session', '/processing', '/result']

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const clearSession = useAppStore((s) => s.clearSession)

  const isUserRoute = USER_ROUTES.includes(location.pathname)

  const handleExit = () => {
    clearSession()
    document.exitFullscreen?.()
    navigate('/')
  }

  return (
    <div className="min-h-screen w-full bg-black text-white relative">
      {/* Exit button — hanya di user flow */}
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
