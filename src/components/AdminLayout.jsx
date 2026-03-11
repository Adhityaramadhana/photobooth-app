import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'

const NAV_ITEMS = [
  { path: '/admin/gallery', label: 'Gallery', icon: '📷' },
  { path: '/admin/transactions', label: 'Transaksi', icon: '💰' },
  { path: '/admin/vouchers', label: 'Voucher', icon: '🎟️' },
  { path: '/admin/frames', label: 'Frame Manager', icon: '🖼️' },
  { path: '/admin/payment', label: 'Payment', icon: '⚙️' },
  { path: '/admin/printer', label: 'Printer', icon: '🖨️' },
  { path: '/admin/branding', label: 'Branding', icon: '🎨' },
  { path: '/admin/cloud', label: 'Cloud', icon: '☁️' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const { adminAuthenticated, setAdminAuthenticated } = useAppStore()

  // Route guard
  if (!adminAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  const handleLogout = () => {
    setAdminAuthenticated(false)
    navigate('/')
  }

  return (
    <div className="flex h-screen bg-brand-primary text-brand-text">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col bg-brand-surface border-r border-white/10">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <span className="font-bold text-sm text-brand-text">Admin Panel</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-secondary text-white'
                    : 'text-brand-text/60 hover:text-brand-text hover:bg-white/5'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Exit */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-text/50 hover:text-brand-text hover:bg-white/5 rounded-lg transition-colors"
          >
            <span>✕</span>
            <span>Exit</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
