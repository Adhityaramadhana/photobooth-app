import { useState, useEffect } from 'react'

export default function AdminPrinterSettings() {
  const [form, setForm] = useState({ name: '', copies: 1 })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    window.electronAPI.admin.getSettings().then(({ settings }) => {
      setForm({
        name: settings?.printer?.name ?? '',
        copies: settings?.printer?.copies ?? 1,
      })
    })
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    const { settings } = await window.electronAPI.admin.getSettings()
    await window.electronAPI.admin.saveSettings({
      ...settings,
      printer: { name: form.name, copies: Number(form.copies) },
    })
    setMsg('Tersimpan!')
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold text-brand-text mb-6">Printer Settings</h1>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <label className="text-brand-text/50 text-xs mb-1 block">Nama Printer</label>
          <input
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Contoh: Canon SELPHY CP1500"
            className="w-full px-3 py-2 bg-brand-surface border border-white/10 rounded-lg text-brand-text text-sm focus:outline-none focus:border-brand-secondary"
          />
          <p className="text-brand-text/30 text-xs mt-1">Nama harus sama persis dengan nama printer di Windows</p>
        </div>

        <div>
          <label className="text-brand-text/50 text-xs mb-1 block">Jumlah Cetak per Sesi</label>
          <input
            type="number" min="1" max="5"
            value={form.copies}
            onChange={(e) => setForm(f => ({ ...f, copies: e.target.value }))}
            className="w-32 px-3 py-2 bg-brand-surface border border-white/10 rounded-lg text-brand-text text-sm focus:outline-none focus:border-brand-secondary"
          />
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" className="px-6 py-2 bg-brand-secondary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">
            Simpan
          </button>
          {msg && <span className="text-green-400 text-sm">{msg}</span>}
        </div>
      </form>
    </div>
  )
}
