import { useState, useEffect } from 'react'

const EMPTY_FORM = { code: '', type: 'free', discount: 0, maxUse: 1, expiresAt: '' }

export default function AdminVouchers() {
  const [vouchers, setVouchers] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const { vouchers: list } = await window.electronAPI.admin.getVouchers()
    setVouchers(list ?? [])
  }

  useEffect(() => { load() }, [])

  const showMsg = (text) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 2000)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.code.trim()) return
    const voucher = {
      ...form,
      code: form.code.toUpperCase().trim(),
      discount: Number(form.discount),
      maxUse: Number(form.maxUse),
      usedCount: 0,
      expiresAt: form.expiresAt || null,
    }
    const { success } = await window.electronAPI.admin.saveVoucher(voucher)
    if (success) {
      setForm(EMPTY_FORM)
      await load()
      showMsg('Voucher disimpan!')
    }
  }

  const handleDelete = async (code) => {
    if (!confirm(`Hapus voucher "${code}"?`)) return
    await window.electronAPI.admin.deleteVoucher(code)
    await load()
  }

  return (
    <div className="p-6 flex gap-8">
      {/* Form tambah */}
      <div className="w-72 flex-shrink-0">
        <h2 className="text-lg font-bold text-brand-text mb-4">Tambah Voucher</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <label className="text-brand-text/50 text-xs mb-1 block">Kode</label>
            <input
              value={form.code}
              onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))}
              placeholder="FREE001"
              className="w-full px-3 py-2 bg-brand-surface border border-white/10 rounded-lg text-brand-text text-sm focus:outline-none focus:border-brand-secondary uppercase"
            />
          </div>

          <div>
            <label className="text-brand-text/50 text-xs mb-1 block">Tipe</label>
            <select
              value={form.type}
              onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full px-3 py-2 bg-brand-surface border border-white/10 rounded-lg text-brand-text text-sm focus:outline-none"
            >
              <option value="free">Gratis (100%)</option>
              <option value="discount">Diskon (%)</option>
            </select>
          </div>

          {form.type === 'discount' && (
            <div>
              <label className="text-brand-text/50 text-xs mb-1 block">Diskon (%)</label>
              <input
                type="number" min="1" max="100"
                value={form.discount}
                onChange={(e) => setForm(f => ({ ...f, discount: e.target.value }))}
                className="w-full px-3 py-2 bg-brand-surface border border-white/10 rounded-lg text-brand-text text-sm focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-brand-text/50 text-xs mb-1 block">Maks. Pakai</label>
            <input
              type="number" min="1"
              value={form.maxUse}
              onChange={(e) => setForm(f => ({ ...f, maxUse: e.target.value }))}
              className="w-full px-3 py-2 bg-brand-surface border border-white/10 rounded-lg text-brand-text text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="text-brand-text/50 text-xs mb-1 block">Kadaluarsa (opsional)</label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              className="w-full px-3 py-2 bg-brand-surface border border-white/10 rounded-lg text-brand-text text-sm focus:outline-none"
            />
          </div>

          <button type="submit" className="py-2 bg-brand-secondary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">
            Simpan Voucher
          </button>

          {msg && <p className="text-green-400 text-xs text-center">{msg}</p>}
        </form>
      </div>

      {/* List voucher */}
      <div className="flex-1">
        <h2 className="text-lg font-bold text-brand-text mb-4">Daftar Voucher ({vouchers.length})</h2>

        {vouchers.length === 0 && (
          <p className="text-brand-text/30 text-sm">Belum ada voucher.</p>
        )}

        <div className="flex flex-col gap-2">
          {vouchers.map((v) => (
            <div key={v.code} className="flex items-center justify-between px-4 py-3 bg-brand-surface border border-white/10 rounded-xl">
              <div className="flex items-center gap-4">
                <span className="font-mono font-bold text-brand-secondary">{v.code}</span>
                <span className={`px-2 py-0.5 text-xs rounded ${v.type === 'free' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                  {v.type === 'free' ? 'Gratis' : `${v.discount}% off`}
                </span>
                <span className="text-brand-text/40 text-xs">{v.usedCount}/{v.maxUse}x pakai</span>
                {v.expiresAt && <span className="text-brand-text/30 text-xs">exp: {v.expiresAt}</span>}
              </div>
              <button
                onClick={() => handleDelete(v.code)}
                className="text-brand-text/30 hover:text-red-400 transition text-sm"
              >Hapus</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
