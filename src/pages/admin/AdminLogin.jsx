import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'

const PIN_LENGTH = 4

export default function AdminLogin() {
  const navigate = useNavigate()
  const setAdminAuthenticated = useAppStore((s) => s.setAdminAuthenticated)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const handleDigit = (digit) => {
    if (pin.length >= PIN_LENGTH || loading) return
    const next = pin + digit
    setPin(next)
    setError('')

    if (next.length === PIN_LENGTH) {
      submitPin(next)
    }
  }

  const handleDelete = () => {
    if (loading) return
    setPin((p) => p.slice(0, -1))
    setError('')
  }

  const submitPin = async (value) => {
    setLoading(true)
    setError('')
    try {
      const { success } = await window.electronAPI.admin.verifyPassword(value)
      if (success) {
        setAdminAuthenticated(true)
        navigate('/admin/frames')
      } else {
        setShake(true)
        setTimeout(() => setShake(false), 500)
        setError('PIN salah')
        setPin('')
      }
    } catch {
      setError('Gagal verifikasi')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <div className="flex flex-col items-center gap-2">
        <span className="text-4xl">⚙️</span>
        <h1 className="text-3xl font-bold text-brand-text">Admin Login</h1>
        <p className="text-brand-text/40 text-sm">Masukkan PIN 4 digit</p>
      </div>

      {/* PIN dots */}
      <div className={`flex gap-4 ${shake ? 'animate-shake' : ''}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
              i < pin.length
                ? 'bg-brand-secondary border-brand-secondary scale-110'
                : 'bg-transparent border-white/20'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm -mt-4">{error}</p>}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-72">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => handleDigit(String(n))}
            className="h-16 bg-brand-surface border border-white/10 rounded-2xl text-2xl font-semibold text-brand-text active:bg-brand-secondary active:scale-95 transition select-none"
          >
            {n}
          </button>
        ))}

        {/* Bottom row: back, 0, delete */}
        <button
          onClick={() => navigate('/')}
          className="h-16 rounded-2xl text-sm text-brand-text/30 active:text-brand-text/60 transition select-none"
        >
          Kembali
        </button>

        <button
          onClick={() => handleDigit('0')}
          className="h-16 bg-brand-surface border border-white/10 rounded-2xl text-2xl font-semibold text-brand-text active:bg-brand-secondary active:scale-95 transition select-none"
        >
          0
        </button>

        <button
          onClick={handleDelete}
          className="h-16 rounded-2xl text-2xl text-brand-text/50 active:text-brand-text active:scale-95 transition select-none"
        >
          ⌫
        </button>
      </div>
    </div>
  )
}
