import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'
import SplitLayout from '../../components/SplitLayout'

const QRIS_TIMEOUT_SEC = 5 * 60 // 5 menit
const POLL_INTERVAL_MS = 3000

function formatRp(amount) {
  return `Rp${Number(amount).toLocaleString('id-ID')}`
}

export default function Payment() {
  const navigate = useNavigate()
  const { setPaymentStatus, setPaymentMethod } = useAppStore()
  const layoutTemplate = useAppStore((s) => s.branding.layoutTemplate)

  const [step, setStep] = useState('choose')    // 'choose' | 'qris' | 'voucher'
  const [qrImage, setQrImage] = useState(null)
  const [orderId, setOrderId] = useState(null)
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [timeLeft, setTimeLeft] = useState(QRIS_TIMEOUT_SEC)
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherError, setVoucherError] = useState(null)
  const [sessionPrice, setSessionPrice] = useState(30000)

  const pollingRef = useRef(null)
  const countdownRef = useRef(null)

  // Height class: when split, content fills the right panel; when centered, fill viewport
  const contentHeight = layoutTemplate === 'split' ? 'flex-1' : 'min-h-screen'

  useEffect(() => {
    window.electronAPI.admin.getSettings().then(({ settings }) => {
      setSessionPrice(settings?.pricing?.sessionPrice ?? 30000)
    })
  }, [])

  useEffect(() => {
    return () => {
      clearInterval(pollingRef.current)
      clearInterval(countdownRef.current)
    }
  }, [])

  async function handleOnPaid(method, amount) {
    clearInterval(pollingRef.current)
    clearInterval(countdownRef.current)
    await window.electronAPI.db.logTransaction({
      method,
      amount,
      frame: '-',
      photoCount: 0
    })
    setPaymentStatus('paid')
    setPaymentMethod(method)
    navigate('/select-frame')
  }

  async function handleChooseQris() {
    setLoading(true)
    const result = await window.electronAPI.payment.createOrder({
      amount: sessionPrice,
      orderId: `pb-${Date.now()}`
    })
    setLoading(false)

    if (!result.success) {
      setError('Gagal membuat pembayaran. Silakan coba lagi.')
      setLoading(false)
      return
    }
    setError(null)

    setQrImage(result.qrImageBase64)
    setOrderId(result.orderId)
    setIsMock(result.mock)
    setTimeLeft(QRIS_TIMEOUT_SEC)
    setStep('qris')

    if (!result.mock) {
      // Start polling
      pollingRef.current = setInterval(async () => {
        const { paid } = await window.electronAPI.payment.checkStatus(result.orderId)
        if (paid) {
          clearInterval(pollingRef.current)
          clearInterval(countdownRef.current)
          handleOnPaid('qris', sessionPrice)
        }
      }, POLL_INTERVAL_MS)
    }

    // Countdown timer
    countdownRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(pollingRef.current)
          clearInterval(countdownRef.current)
          setStep('choose')
          return QRIS_TIMEOUT_SEC
        }
        return t - 1
      })
    }, 1000)
  }

  async function handleValidateVoucher() {
    if (!voucherCode.trim()) return
    setVoucherError(null)

    const result = await window.electronAPI.voucher.validate(voucherCode.trim().toUpperCase())

    if (!result.valid) {
      setVoucherError(result.error || 'Voucher tidak valid')
      return
    }

    const finalAmount = result.type === 'free'
      ? 0
      : Math.round(sessionPrice * (1 - (result.discount ?? 0) / 100))

    handleOnPaid('voucher', finalAmount)
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  function handleBack() {
    clearInterval(pollingRef.current)
    clearInterval(countdownRef.current)
    setStep('choose')
  }

  // ── Titles per step ──────────────────────────────────────────────────────────
  const splitTitles = {
    choose: { title: 'Pilih Metode Pembayaran', subtitle: formatRp(sessionPrice) + ' per sesi' },
    qris:   { title: 'Cashless Payment', subtitle: 'Scan QR untuk bayar' },
    voucher:{ title: 'Voucher', subtitle: 'Masukkan kode voucher' },
  }

  const { title, subtitle } = splitTitles[step] || splitTitles.choose

  // ── Step: choose ──────────────────────────────────────────────────────────
  if (step === 'choose') {
    return (
      <SplitLayout title={title} subtitle={subtitle}>
        <div className={`flex flex-col items-center justify-center ${contentHeight} gap-10 px-8`}>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-brand-text tracking-tight">Pilih Metode Bayar</h1>
            <p className="text-brand-text/40 text-sm mt-2">{formatRp(sessionPrice)} per sesi</p>
          </div>

          <div className="flex gap-6 w-full max-w-xl">
            <button
              onClick={handleChooseQris}
              disabled={loading}
              className="flex-1 flex flex-col items-center gap-4 bg-brand-surface border-2 border-white/10 rounded-2xl p-8 active:scale-95 transition hover:border-brand-secondary"
            >
              <span className="text-5xl">📱</span>
              <div className="text-center">
                <p className="text-brand-text font-bold text-xl">QRIS</p>
                <p className="text-brand-text/40 text-sm mt-1">Bayar dengan GoPay, OVO, DANA, dll</p>
              </div>
            </button>

            <button
              onClick={() => setStep('voucher')}
              className="flex-1 flex flex-col items-center gap-4 bg-brand-surface border-2 border-white/10 rounded-2xl p-8 active:scale-95 transition hover:border-brand-secondary"
            >
              <span className="text-5xl">🎟</span>
              <div className="text-center">
                <p className="text-brand-text font-bold text-xl">Voucher</p>
                <p className="text-brand-text/40 text-sm mt-1">Masukkan kode voucher</p>
              </div>
            </button>
          </div>

          {loading && (
            <div className="w-8 h-8 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
          )}

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
        </div>
      </SplitLayout>
    )
  }

  // ── Step: qris ────────────────────────────────────────────────────────────
  if (step === 'qris') {
    return (
      <SplitLayout title={title} subtitle={subtitle}>
        <div className={`flex flex-col items-center justify-center ${contentHeight} gap-6`}>
          <h1 className="text-3xl font-bold text-brand-text">Scan QRIS untuk Membayar</h1>
          <p className="text-brand-text/60 text-lg font-semibold">{formatRp(sessionPrice)}</p>

          {isMock ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-64 h-64 bg-brand-surface border-2 border-brand-secondary/30 rounded-2xl flex flex-col items-center justify-center gap-3 p-6">
                <span className="text-4xl">🔧</span>
                <p className="text-brand-text/40 text-xs text-center">Mode development: Midtrans belum dikonfigurasi</p>
              </div>
              <button
                onClick={() => handleOnPaid('qris', sessionPrice)}
                className="px-10 py-4 bg-brand-secondary text-brand-secondary-text rounded-2xl text-lg font-semibold active:scale-95 transition"
              >
                Simulasi Bayar ✓
              </button>
            </div>
          ) : (
            <div className="w-64 h-64 bg-white rounded-2xl p-2 overflow-hidden">
              <img src={qrImage} alt="QRIS" className="w-full h-full object-contain" />
            </div>
          )}

          <div className="flex flex-col items-center gap-1">
            <p className="text-brand-text/40 text-sm">Bayar dalam</p>
            <p className="text-brand-text font-mono text-2xl font-bold">{formatTime(timeLeft)}</p>
          </div>

          <button
            onClick={handleBack}
            className="text-brand-text/30 text-sm hover:text-brand-text/60 transition"
          >
            ← Kembali
          </button>
        </div>
      </SplitLayout>
    )
  }

  // ── Step: voucher ─────────────────────────────────────────────────────────
  return (
    <SplitLayout title={title} subtitle={subtitle}>
      <div className={`flex flex-col items-center justify-center ${contentHeight} gap-6 px-8`}>
        <h1 className="text-3xl font-bold text-brand-text">Masukkan Kode Voucher</h1>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          <input
            value={voucherCode}
            onChange={(e) => {
              setVoucherCode(e.target.value.toUpperCase())
              setVoucherError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleValidateVoucher()}
            placeholder="Contoh: FREE001"
            className="w-full px-5 py-4 bg-brand-surface border-2 border-white/10 rounded-xl text-brand-text text-xl font-mono text-center tracking-widest focus:outline-none focus:border-brand-secondary uppercase"
          />

          {voucherError && (
            <p className="text-red-400 text-sm text-center">{voucherError}</p>
          )}

          <button
            onClick={handleValidateVoucher}
            disabled={!voucherCode.trim()}
            className="w-full py-4 bg-brand-secondary text-brand-secondary-text rounded-xl text-lg font-semibold active:scale-95 transition disabled:opacity-40"
          >
            Validasi Voucher
          </button>
        </div>

        <button
          onClick={() => { setVoucherCode(''); setVoucherError(null); setStep('choose') }}
          className="text-brand-text/30 text-sm hover:text-brand-text/60 transition mt-2"
        >
          ← Kembali
        </button>
      </div>
    </SplitLayout>
  )
}
