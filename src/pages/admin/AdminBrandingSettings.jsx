import { useState, useEffect } from 'react'

const inputClass = 'w-full px-3 py-2 bg-brand-surface border border-white/10 rounded-lg text-brand-text text-sm focus:outline-none focus:border-brand-secondary'

export default function AdminBrandingSettings() {
  const [form, setForm] = useState({
    studioName: 'Photobooth',
    primaryColor: '#e94560',
    adminPassword: '',
  })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    window.electronAPI.admin.getSettings().then(({ settings }) => {
      setForm({
        studioName: settings?.branding?.studioName ?? 'Photobooth',
        primaryColor: settings?.branding?.primaryColor ?? '#e94560',
        adminPassword: settings?.admin?.password ?? '',
      })
    })
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    const { settings } = await window.electronAPI.admin.getSettings()
    await window.electronAPI.admin.saveSettings({
      ...settings,
      branding: { studioName: form.studioName, primaryColor: form.primaryColor },
      admin: { password: form.adminPassword || settings?.admin?.password || 'admin123' },
    })
    setMsg('Tersimpan!')
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold text-brand-text mb-6">Branding Settings</h1>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <label className="text-brand-text/50 text-xs mb-1 block">Nama Studio</label>
          <input
            value={form.studioName}
            onChange={(e) => setForm(f => ({ ...f, studioName: e.target.value }))}
            placeholder="Nama studio kamu"
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-brand-text/50 text-xs mb-1 block">Warna Aksen</label>
          <div className="flex items-center gap-3">
            <input
              type="color" value={form.primaryColor}
              onChange={(e) => setForm(f => ({ ...f, primaryColor: e.target.value }))}
              className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
            />
            <span className="text-brand-text/60 text-sm font-mono">{form.primaryColor}</span>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 mt-2">
          <label className="text-brand-text/50 text-xs mb-1 block">Ganti Password Admin</label>
          <input
            type="password"
            value={form.adminPassword}
            onChange={(e) => setForm(f => ({ ...f, adminPassword: e.target.value }))}
            placeholder="Password baru (kosongkan = tidak berubah)"
            className={inputClass}
          />
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
