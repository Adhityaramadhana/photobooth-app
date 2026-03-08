import { useState, useEffect } from 'react'

const inputClass = 'w-full px-3 py-2 bg-brand-surface border border-white/10 rounded-lg text-brand-text text-sm focus:outline-none focus:border-brand-secondary'

export default function AdminCloudSettings() {
  const [form, setForm] = useState({ apiKey: '', storageBucket: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    window.electronAPI.admin.getSettings().then(({ settings }) => {
      setForm({
        apiKey: settings?.firebase?.apiKey ?? '',
        storageBucket: settings?.firebase?.storageBucket ?? '',
      })
    })
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    const { settings } = await window.electronAPI.admin.getSettings()
    await window.electronAPI.admin.saveSettings({
      ...settings,
      firebase: { apiKey: form.apiKey, storageBucket: form.storageBucket },
    })
    setMsg('Tersimpan!')
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold text-brand-text mb-2">Cloud Storage</h1>
      <p className="text-brand-text/40 text-sm mb-6">
        Firebase Storage — gratis 5 GB. Daftar di{' '}
        <span className="font-mono text-brand-text/60">console.firebase.google.com</span>
        {' '}→ Storage → buat bucket → set rules ke public.
      </p>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <label className="text-brand-text/50 text-xs mb-1 block">API Key</label>
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm(f => ({ ...f, apiKey: e.target.value }))}
            placeholder="AIzaSyXXXXXXXXXXXXXXXXXX"
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-brand-text/50 text-xs mb-1 block">Storage Bucket</label>
          <input
            value={form.storageBucket}
            onChange={(e) => setForm(f => ({ ...f, storageBucket: e.target.value }))}
            placeholder="your-project.appspot.com"
            className={inputClass}
          />
          <p className="text-brand-text/30 text-xs mt-1">
            Kosongkan = hasil foto tidak diunggah ke cloud (QR tidak tampil).
          </p>
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
