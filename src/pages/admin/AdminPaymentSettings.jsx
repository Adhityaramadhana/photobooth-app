import { useState, useEffect } from 'react'

export default function AdminPaymentSettings() {
  const [form, setForm] = useState({ serverKey: '', clientKey: '', isProduction: false, sessionPrice: 30000 })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    window.electronAPI.admin.getSettings().then(({ settings }) => {
      setForm({
        serverKey: settings?.midtrans?.serverKey ?? '',
        clientKey: settings?.midtrans?.clientKey ?? '',
        isProduction: settings?.midtrans?.isProduction ?? false,
        sessionPrice: settings?.pricing?.sessionPrice ?? 30000,
      })
    })
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    const { settings } = await window.electronAPI.admin.getSettings()
    await window.electronAPI.admin.saveSettings({
      ...settings,
      midtrans: { serverKey: form.serverKey, clientKey: form.clientKey, isProduction: form.isProduction },
      pricing: { sessionPrice: Number(form.sessionPrice) },
    })
    setMsg('Tersimpan!')
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold text-brand-text mb-6">Payment Settings</h1>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <Field label="Harga Sesi (Rp)">
          <input
            type="number" value={form.sessionPrice}
            onChange={(e) => setForm(f => ({ ...f, sessionPrice: e.target.value }))}
            className={inputClass}
          />
        </Field>

        <div className="border-t border-white/10 pt-4 mt-2">
          <p className="text-brand-text/50 text-sm mb-3">Midtrans API Keys</p>

          <Field label="Server Key">
            <input
              type="password" value={form.serverKey}
              onChange={(e) => setForm(f => ({ ...f, serverKey: e.target.value }))}
              placeholder="SB-Mid-server-xxxx"
              className={inputClass}
            />
          </Field>

          <Field label="Client Key">
            <input
              type="password" value={form.clientKey}
              onChange={(e) => setForm(f => ({ ...f, clientKey: e.target.value }))}
              placeholder="SB-Mid-client-xxxx"
              className={inputClass}
            />
          </Field>

          <label className="flex items-center gap-3 cursor-pointer mt-2">
            <input
              type="checkbox" checked={form.isProduction}
              onChange={(e) => setForm(f => ({ ...f, isProduction: e.target.checked }))}
              className="w-4 h-4 accent-brand-secondary"
            />
            <span className="text-brand-text/70 text-sm">Production mode (matikan untuk sandbox)</span>
          </label>
        </div>

        <div className="flex items-center gap-4 mt-2">
          <button type="submit" className="px-6 py-2 bg-brand-secondary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">
            Simpan
          </button>
          {msg && <span className="text-green-400 text-sm">{msg}</span>}
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="text-brand-text/50 text-xs mb-1 block">{label}</label>
      {children}
    </div>
  )
}

const inputClass = 'w-full px-3 py-2 bg-brand-surface border border-white/10 rounded-lg text-brand-text text-sm focus:outline-none focus:border-brand-secondary'
