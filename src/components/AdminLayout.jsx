import { useState } from 'react'
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
  const { adminAuthenticated, setAdminAuthenticated, adminDirtyGuard, setAdminDirtyGuard } = useAppStore()
  const [pendingNav, setPendingNav] = useState(null)

  if (!adminAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  const guardedNavigate = (path, isLogout) => {
    if (adminDirtyGuard) {
      setPendingNav({ path, isLogout: !!isLogout })
      return
    }
    if (isLogout) {
      setAdminAuthenticated(false)
      navigate('/')
    } else {
      navigate(path)
    }
  }

  const handleConfirmLeave = () => {
    const { path, isLogout } = pendingNav
    setAdminDirtyGuard(false)
    setPendingNav(null)
    if (isLogout) {
      setAdminAuthenticated(false)
      navigate('/')
    } else {
      navigate(path)
    }
  }

  const handleCancelLeave = () => {
    setPendingNav(null)
  }

  return (
    <div className="flex h-screen bg-brand-primary text-brand-text">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col bg-brand-surface border-r border-white/10">
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <span className="font-bold text-sm text-brand-text">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={(e) => {
                if (adminDirtyGuard) {
                  e.preventDefault()
                  guardedNavigate(item.path)
                }
              }}
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

        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => guardedNavigate('/', true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-text/50 hover:text-brand-text hover:bg-white/5 rounded-lg transition-colors"
          >
            <span>✕</span>
            <span>Exit</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Navigation guard dialog */}
      {pendingNav && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-brand-surface border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h2 className="text-lg font-bold text-brand-text mb-2">Perubahan Belum Disimpan</h2>
            <p className="text-brand-text/60 text-sm mb-6">
              Kamu punya perubahan yang belum disimpan. Mau simpan dulu atau buang?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelLeave}
                className="flex-1 px-4 py-2.5 bg-brand-secondary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition"
              >
                Kembali & Simpan
              </button>
              <button
                onClick={handleConfirmLeave}
                className="flex-1 px-4 py-2.5 bg-brand-surface border border-white/10 text-brand-text/70 rounded-lg text-sm font-semibold hover:text-brand-text hover:border-white/30 transition"
              >
                Buang & Lanjut
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
