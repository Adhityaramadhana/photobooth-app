import { useState, useEffect, useRef, useCallback } from 'react'
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

const LAYOUT_OPTIONS = [
  { value: 'centered', label: 'Centered', desc: 'Konten di tengah halaman (default)' },
  { value: 'split', label: 'Split Screen', desc: 'Panel kiri (branding) + panel kanan (konten)' },
]

const DECO_OPTIONS = [
  { value: 'none', label: 'None', desc: 'Tanpa dekorasi', preview: '' },
  { value: 'modern', label: 'Modern', desc: 'Star ✦, sparkle ✸, garis tipis', preview: '✦ ✸ →' },
  { value: 'bold', label: 'Bold', desc: 'Bracket border, dots, arrow tebal', preview: '「 ● ▸' },
]

export default function AdminBrandingSettings() {
  const loadBranding = useAppStore((s) => s.loadBranding)
  const setAdminDirtyGuard = useAppStore((s) => s.setAdminDirtyGuard)

  const [form, setForm] = useState({
    studioName: 'Photobooth',
    primaryColor: '#e94560',
    tagline: '',
    bgColor: '',
    adminPassword: '',
    layoutTemplate: 'centered',
    showLogoPersistent: false,
    decorativePreset: 'none',
    bgOverlayOpacity: 0,
  })

  // Snapshot of last-saved values for dirty comparison
  const [savedForm, setSavedForm] = useState(null)

  const [logoPreview, setLogoPreview] = useState(null)
  const [bgImagePreview, setBgImagePreview] = useState(null)
  const [savedLogoPreview, setSavedLogoPreview] = useState(null)
  const [savedBgImagePreview, setSavedBgImagePreview] = useState(null)

  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const logoInputRef = useRef(null)
  const bgImageInputRef = useRef(null)

  const pendingLogoRef = useRef(null)
  const pendingBgImageRef = useRef(null)
  const pendingDeleteLogoRef = useRef(false)
  const pendingDeleteBgRef = useRef(false)

  // ── Dirty tracking ─────────────────────────────────────────────────────────

  const isDirty = useCallback(() => {
    if (!savedForm) return false
    const formChanged =
      form.studioName !== savedForm.studioName ||
      form.primaryColor !== savedForm.primaryColor ||
      form.tagline !== savedForm.tagline ||
      form.bgColor !== savedForm.bgColor ||
      form.adminPassword !== savedForm.adminPassword ||
      form.layoutTemplate !== savedForm.layoutTemplate ||
      form.showLogoPersistent !== savedForm.showLogoPersistent ||
      form.decorativePreset !== savedForm.decorativePreset ||
      form.bgOverlayOpacity !== savedForm.bgOverlayOpacity
    const logoChanged = logoPreview !== savedLogoPreview
    const bgChanged = bgImagePreview !== savedBgImagePreview
    return formChanged || logoChanged || bgChanged
  }, [form, savedForm, logoPreview, savedLogoPreview, bgImagePreview, savedBgImagePreview])

  const dirty = isDirty()

  // Sync dirty state to Zustand so AdminLayout can guard navigation
  useEffect(() => {
    setAdminDirtyGuard(dirty)
    return () => setAdminDirtyGuard(false)
  }, [dirty, setAdminDirtyGuard])

  // Warn on window/tab close
  useEffect(() => {
    if (!dirty) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // ── Load saved data ────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const { settings } = await window.electronAPI.admin.getSettings()
      const b = settings?.branding ?? {}
      const loaded = {
        studioName: b.studioName ?? 'Photobooth',
        primaryColor: b.primaryColor ?? '#e94560',
        tagline: b.tagline ?? '',
        bgColor: b.bgColor ?? '',
        adminPassword: settings?.admin?.password ?? '',
        layoutTemplate: b.layoutTemplate ?? 'centered',
        showLogoPersistent: b.showLogoPersistent ?? false,
        decorativePreset: b.decorativePreset ?? 'none',
        bgOverlayOpacity: b.bgOverlayOpacity ?? 0,
      }
      setForm(loaded)
      setSavedForm(loaded)

      const [logoRes, bgRes] = await Promise.all([
        window.electronAPI.branding.getLogo(),
        window.electronAPI.branding.getBgImage(),
      ])
      const ld = logoRes.data || null
      const bd = bgRes.data || null
      setLogoPreview(ld)
      setBgImagePreview(bd)
      setSavedLogoPreview(ld)
      setSavedBgImagePreview(bd)
    }
    load()
  }, [])

  // ── File handlers ──────────────────────────────────────────────────────────

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

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setSaving(true)
    setMsg('')

    try {
      const { settings } = await window.electronAPI.admin.getSettings()
      await window.electronAPI.admin.saveSettings({
        ...settings,
        branding: {
          ...settings.branding,
          studioName: form.studioName,
          primaryColor: form.primaryColor,
          tagline: form.tagline,
          bgColor: form.bgColor,
          layoutTemplate: form.layoutTemplate,
          showLogoPersistent: form.showLogoPersistent,
          decorativePreset: form.decorativePreset,
          bgOverlayOpacity: form.bgOverlayOpacity,
        },
        admin: { password: form.adminPassword || settings?.admin?.password || 'admin123' },
      })

      if (pendingDeleteLogoRef.current) {
        await window.electronAPI.branding.deleteLogo()
        pendingDeleteLogoRef.current = false
      } else if (pendingLogoRef.current) {
        await window.electronAPI.branding.uploadLogo(pendingLogoRef.current)
        pendingLogoRef.current = null
      }

      if (pendingDeleteBgRef.current) {
        await window.electronAPI.branding.deleteBgImage()
        pendingDeleteBgRef.current = false
      } else if (pendingBgImageRef.current) {
        await window.electronAPI.branding.uploadBgImage(pendingBgImageRef.current)
        pendingBgImageRef.current = null
      }

      await loadBranding()

      // Update saved snapshots so dirty becomes false
      setSavedForm({ ...form })
      setSavedLogoPreview(logoPreview)
      setSavedBgImagePreview(bgImagePreview)

      setMsg('Tersimpan!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      setMsg('Gagal menyimpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Discard unsaved changes ────────────────────────────────────────────────

  const handleDiscard = () => {
    if (!savedForm) return
    setForm({ ...savedForm })
    setLogoPreview(savedLogoPreview)
    setBgImagePreview(savedBgImagePreview)
    pendingLogoRef.current = null
    pendingBgImageRef.current = null
    pendingDeleteLogoRef.current = false
    pendingDeleteBgRef.current = false
    if (logoInputRef.current) logoInputRef.current.value = ''
    if (bgImageInputRef.current) bgImageInputRef.current.value = ''
  }

  return (
    <div className="relative h-full overflow-y-auto">

      {/* ── Sticky unsaved-changes bar ────────────────────────────────── */}
      {dirty && (
        <div className="sticky top-0 z-40 flex items-center justify-between gap-4 px-6 py-3 bg-yellow-600/90 backdrop-blur-sm border-b border-yellow-500/50">
          <span className="text-sm text-white font-medium">
            Ada perubahan yang belum disimpan
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              className="px-4 py-1.5 text-sm text-white/80 hover:text-white border border-white/30 rounded-lg transition"
            >
              Buang Perubahan
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-1.5 text-sm font-semibold text-yellow-900 bg-white rounded-lg hover:bg-yellow-50 transition disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Sekarang'}
            </button>
          </div>
        </div>
      )}

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

          {/* ── Background Overlay Opacity ────────────────────── */}
          <div>
            <label className="text-brand-text/50 text-xs mb-1 block">
              Background Overlay Gelap — {form.bgOverlayOpacity}%
            </label>
            <input
              type="range"
              min="0"
              max="80"
              step="5"
              value={form.bgOverlayOpacity}
              onChange={(e) => setForm(f => ({ ...f, bgOverlayOpacity: parseInt(e.target.value) }))}
              className="w-full max-w-sm accent-brand-secondary"
            />
            <p className="text-brand-text/30 text-xs mt-1">
              Lapisan gelap di atas background agar teks lebih terbaca. 0% = tanpa overlay.
            </p>
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="border-t border-white/10 pt-4 mt-2">
            <h2 className="text-lg font-semibold text-brand-text mb-4">Tampilan Halaman User</h2>
          </div>

          {/* ── Layout Template ──────────────────────────────────── */}
          <div>
            <label className="text-brand-text/50 text-xs mb-2 block">Layout Template</label>
            <div className="flex gap-3">
              {LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, layoutTemplate: opt.value }))}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition ${
                    form.layoutTemplate === opt.value
                      ? 'border-brand-secondary bg-brand-secondary/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Mini preview */}
                  <div className="w-full h-16 rounded bg-brand-surface/50 flex overflow-hidden">
                    {opt.value === 'centered' ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-8 h-4 rounded bg-white/20" />
                      </div>
                    ) : (
                      <>
                        <div className="w-[35%] border-r border-white/10 flex items-center justify-center">
                          <div className="w-4 h-6 rounded bg-white/15" />
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <div className="w-8 h-4 rounded bg-white/20" />
                        </div>
                      </>
                    )}
                  </div>
                  <span className="text-brand-text text-sm font-medium">{opt.label}</span>
                  <span className="text-brand-text/30 text-xs text-center">{opt.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-brand-text/30 text-xs mt-2">
              Split Screen berlaku di halaman Payment dan Result. Halaman lain (Idle, Select Frame, Photo, Processing) tetap full-screen.
            </p>
          </div>

          {/* ── Logo Persistent ──────────────────────────────────── */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showLogoPersistent}
                onChange={(e) => setForm(f => ({ ...f, showLogoPersistent: e.target.checked }))}
                className="w-4 h-4 rounded accent-brand-secondary"
              />
              <div>
                <span className="text-brand-text text-sm font-medium">Tampilkan Logo di Semua Halaman</span>
                <p className="text-brand-text/30 text-xs">Logo kecil di pojok kiri atas setiap halaman user (kecuali Idle Screen)</p>
              </div>
            </label>
          </div>

          {/* ── Decorative Elements ──────────────────────────────── */}
          <div>
            <label className="text-brand-text/50 text-xs mb-2 block">Elemen Dekoratif</label>
            <div className="flex gap-3">
              {DECO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, decorativePreset: opt.value }))}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition ${
                    form.decorativePreset === opt.value
                      ? 'border-brand-secondary bg-brand-secondary/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-brand-text text-lg h-7 flex items-center">
                    {opt.preview || '—'}
                  </span>
                  <span className="text-brand-text text-sm font-medium">{opt.label}</span>
                  <span className="text-brand-text/30 text-xs text-center">{opt.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-brand-text/30 text-xs mt-2">
              Elemen dekoratif menggunakan warna aksen. Tampil di panel kiri saat layout Split Screen aktif.
            </p>
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

          {/* ── Save (bottom) ─────────────────────────────────────── */}
          <div className="flex items-center gap-4 mt-2 pb-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-brand-secondary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            {dirty && (
              <button
                type="button"
                onClick={handleDiscard}
                className="px-4 py-2 text-brand-text/40 text-sm hover:text-brand-text/70 transition"
              >
                Buang Perubahan
              </button>
            )}
            {msg && (
              <span className={`text-sm ${msg.startsWith('Gagal') ? 'text-red-400' : 'text-green-400'}`}>
                {msg}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
