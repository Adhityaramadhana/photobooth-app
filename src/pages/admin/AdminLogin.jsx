import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'

export default function AdminLogin() {
  const navigate = useNavigate()
  const setAdminAuthenticated = useAppStore((s) => s.setAdminAuthenticated)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')
    try {
      const { success } = await window.electronAPI.admin.verifyPassword(password)
      if (success) {
        setAdminAuthenticated(true)
        navigate('/admin/frames')
      } else {
        setError('Password salah')
      }
    } catch {
      setError('Gagal verifikasi password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <div className="flex flex-col items-center gap-2">
        <span className="text-4xl">⚙️</span>
        <h1 className="text-3xl font-bold text-brand-text">Admin Login</h1>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-4 w-80">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Masukkan password"
          className="px-4 py-3 bg-brand-surface border border-white/10 rounded-xl text-brand-text placeholder-white/30 focus:outline-none focus:border-brand-secondary"
          autoFocus
        />

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="py-3 bg-brand-secondary text-white rounded-xl font-semibold disabled:opacity-50 transition active:scale-95"
        >
          {loading ? 'Memverifikasi...' : 'Login'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="py-2 text-brand-text/30 hover:text-brand-text/60 text-sm transition"
        >
          ← Kembali
        </button>
      </form>
    </div>
  )
}
