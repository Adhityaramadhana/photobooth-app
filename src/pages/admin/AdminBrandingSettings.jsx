import { useState, useEffect, useRef } from 'react'
import useAppStore from '../../store/useAppStore'

const inputClass = 'w-full px-3 py-2 bg-brand-surface border border-white/10 rounded-lg text-brand-text text-sm focus:outline-none focus:border-brand-secondary'

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

export default function AdminBrandingSettings() {
  const loadBranding = useAppStore((s) => s.loadBranding)

  const [form, setForm] = useState({
    studioName: 'Photobooth',
    primaryColor: '#e94560',
    tagline: '',
    bgColor: '',
    adminPassword: '',
  })

  const [logoPreview, setLogoPreview] = useState(null)
  const [bgImagePreview, setBgImagePreview] = useState(null)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const logoInputRef = useRef(null)
  const bgImageInputRef = useRef(null)

  // Pending file data URLs to upload on save
  const pendingLogoRef = useRef(null)
  const pendingBgImageRef = useRef(null)
  const pendingDeleteLogoRef = useRef(false)
  const pendingDeleteBgRef = useRef(false)

  useEffect(() => {
    const load = async () => {
      const { settings } = await window.electronAPI.admin.getSettings()
      const b = settings?.branding ?? {}
      setForm({
        studioName: b.studioName ?? 'Photobooth',
        primaryColor: b.primaryColor ?? '#e94560',
        tagline: b.tagline ?? '',
        bgColor: b.bgColor ?? '',
        adminPassword: settings?.admin?.password ?? '',
      })

      const [logoRes, bgRes] = await Promise.all([
        window.electronAPI.branding.getLogo(),
        window.electronAPI.branding.getBgImage(),
      ])
      if (logoRes.data) setLogoPreview(logoRes.data)
      if (bgRes.data) setBgImagePreview(bgRes.data)
    }
    load()
  }, [])

  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    if (dataUrl) {
      pendingLogoRef.current = dataUrl
      pendingDeleteLogoRef.current = false
      setLogoPreview(dataUrl)
    }
  }

  const handleDeleteLogo = () => {
    pendingLogoRef.current = null
    pendingDeleteLogoRef.current = true
    setLogoPreview(null)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleBgImageSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    if (dataUrl) {
      pendingBgImageRef.current = dataUrl
      pendingDeleteBgRef.current = false
      setBgImagePreview(dataUrl)
    }
  }

  const handleDeleteBgImage = () => {
    pendingBgImageRef.current = null
    pendingDeleteBgRef.current = true
    setBgImagePreview(null)
    if (bgImageInputRef.current) bgImageInputRef.current.value = ''
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')

    try {
      // 1) Save text/color settings
      const { settings } = await window.electronAPI.admin.getSettings()
      await window.electronAPI.admin.saveSettings({
        ...settings,
        branding: {
          ...settings.branding,
          studioName: form.studioName,
          primaryColor: form.primaryColor,
          tagline: form.tagline,
          bgColor: form.bgColor,
        },
        admin: { password: form.adminPassword || settings?.admin?.password || 'admin123' },
      })

      // 2) Handle logo upload / delete
      if (pendingDeleteLogoRef.current) {
        await window.electronAPI.branding.deleteLogo()
        pendingDeleteLogoRef.current = false
      } else if (pendingLogoRef.current) {
        await window.electronAPI.branding.uploadLogo(pendingLogoRef.current)
        pendingLogoRef.current = null
      }

      // 3) Handle bg image upload / delete
      if (pendingDeleteBgRef.current) {
        await window.electronAPI.branding.deleteBgImage()
        pendingDeleteBgRef.current = false
      } else if (pendingBgImageRef.current) {
        await window.electronAPI.branding.uploadBgImage(pendingBgImageRef.current)
        pendingBgImageRef.current = null
      }

      // 4) Reload global branding store so all pages get the update instantly
      await loadBranding()

      setMsg('Tersimpan!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      setMsg('Gagal menyimpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-text mb-6">Branding Settings</h1>

      <form onSubmit={handleSave} className="flex flex-col gap-6">

        {/* ── Studio Name ─────────────────────────────────────── */}
        <div>
          <label className="text-brand-text/50 text-xs mb-1 block">Nama Studio</label>
          <input
            value={form.studioName}
            onChange={(e) => setForm(f => ({ ...f, studioName: e.target.value }))}
            placeholder="Nama studio kamu"
            className={inputClass}
          />
        </div>

        {/* ── Tagline ─────────────────────────────────────────── */}
        <div>
          <label className="text-brand-text/50 text-xs mb-1 block">Tagline</label>
          <input
            value={form.tagline}
            onChange={(e) => setForm(f => ({ ...f, tagline: e.target.value }))}
            placeholder="Contoh: Capture Your Best Moments"
            className={inputClass}
          />
          <p className="text-brand-text/30 text-xs mt-1">Ditampilkan di bawah nama studio</p>
        </div>

        {/* ── Logo ────────────────────────────────────────────── */}
        <div>
          <label className="text-brand-text/50 text-xs mb-2 block">Logo Studio</label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <div className="relative group">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-20 w-auto max-w-[200px] object-contain rounded-lg border border-white/10 bg-brand-surface p-2"
                />
                <button
                  type="button"
                  onClick={handleDeleteLogo}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="h-20 w-32 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
                <span className="text-brand-text/20 text-xs">No logo</span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="px-4 py-2 bg-brand-surface border border-white/10 rounded-lg text-brand-text text-sm hover:border-brand-secondary transition"
              >
                {logoPreview ? 'Ganti Logo' : 'Upload Logo'}
              </button>
              <p className="text-brand-text/30 text-xs">PNG/JPG, disarankan transparan</p>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* ── Accent Color ────────────────────────────────────── */}
        <div>
          <label className="text-brand-text/50 text-xs mb-1 block">Warna Aksen</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.primaryColor}
              onChange={(e) => setForm(f => ({ ...f, primaryColor: e.target.value }))}
              className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
            />
            <span className="text-brand-text/60 text-sm font-mono">{form.primaryColor}</span>
            <p className="text-brand-text/30 text-xs ml-2">Warna tombol & aksen di halaman user</p>
          </div>
        </div>

        {/* ── Background Color ────────────────────────────────── */}
        <div>
          <label className="text-brand-text/50 text-xs mb-1 block">Background Warna (Halaman User)</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.bgColor || '#000000'}
              onChange={(e) => setForm(f => ({ ...f, bgColor: e.target.value }))}
              className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
            />
            <span className="text-brand-text/60 text-sm font-mono">{form.bgColor || '(default hitam)'}</span>
            {form.bgColor && (
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, bgColor: '' }))}
                className="text-red-400 text-xs hover:underline"
              >
                Reset ke default
              </button>
            )}
          </div>
          <p className="text-brand-text/30 text-xs mt-1">Diabaikan jika background gambar diupload</p>
        </div>

        {/* ── Background Image ────────────────────────────────── */}
        <div>
          <label className="text-brand-text/50 text-xs mb-2 block">Background Gambar (Halaman User)</label>
          <div className="flex items-start gap-4">
            {bgImagePreview ? (
              <div className="relative group">
                <img
                  src={bgImagePreview}
                  alt="BG preview"
                  className="h-28 w-auto max-w-[240px] object-cover rounded-lg border border-white/10"
                />
                <button
                  type="button"
                  onClick={handleDeleteBgImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="h-28 w-40 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
                <span className="text-brand-text/20 text-xs text-center px-2">No background</span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => bgImageInputRef.current?.click()}
                className="px-4 py-2 bg-brand-surface border border-white/10 rounded-lg text-brand-text text-sm hover:border-brand-secondary transition"
              >
                {bgImagePreview ? 'Ganti Gambar' : 'Upload Gambar'}
              </button>
              <p className="text-brand-text/30 text-xs">JPG/PNG, akan di-cover ke layar penuh</p>
            </div>
            <input
              ref={bgImageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleBgImageSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* ── Admin Password ──────────────────────────────────── */}
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

        {/* ── Save ────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-brand-secondary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          {msg && (
            <span className={`text-sm ${msg.startsWith('Gagal') ? 'text-red-400' : 'text-green-400'}`}>
              {msg}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
