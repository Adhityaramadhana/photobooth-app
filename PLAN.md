# Photobooth App — Project Plan & Status

## Completed Phases

### Fase 1 ✅ — Foundation
- Skeleton project Electron + React + Tailwind
- Routing (HashRouter), Zustand store, IPC ping

### Fase 2 ✅ — Camera System
- Camera handlers: Mock mode, Webcam mode, DSLR (digiCamControl)
- Live view, capture, health check
- Halaman lama diganti flow baru

### Fase 3 ✅ — Frame Editor (Admin)
- fabric.js v7 template editor
- Multi-layer: background, overlay, photo-slot, text (static/dynamic)
- Paper presets, DPI, orientation
- Auto-export PNG overlay + config.json v2
- OOB slot transform (overlay keluar canvas)

### Fase 4 ✅ — UI Restructure
- ModeSelect: pilih User / Admin
- User flow: Idle → Payment → SelectFrame → PhotoSession → Processing → Result
- Exit button, fullscreen, store update

### Fase 5 ✅ — Admin Panel
- AdminLogin (password gate)
- AdminLayout (sidebar nav + route guard)
- Frame Manager, Gallery, Transaksi, Voucher
- Settings: Payment, Printer, Branding, Cloud

### Fase 6 ✅ — Processing Pipeline
- Composite foto + frame (sharp)
- GIF + Boomerang generation
- Cloud upload (Firebase Storage)
- QR code result
- Auto print

### Fase 7 ✅ — Payment
- Midtrans QRIS (mock & real)
- Voucher system (free/discount, max use, expiry)
- Transaction logging

### Fase 8 🔄 — Polish & Hardening (in progress)

#### Done
- ✅ Webcam mirror: capture & GIF frame di-flip horizontal (konsisten dengan preview)
- ✅ Branding system overhaul:
  - Load branding SEKALI di startup → Zustand → semua page baca dari store (no flash)
  - Fitur baru: logo upload, tagline, background warna/gambar
  - Warna aksen dinamis via CSS variable (hanya halaman user)
  - ModeSelect & Admin panel tidak terpengaruh custom aksen
- ✅ Admin unsaved changes guard:
  - Dirty state tracking (form vs saved snapshot)
  - Sticky "unsaved changes" bar di atas form
  - Navigation blocker dialog di sidebar AdminLayout
  - beforeunload warning (close tab/window)
- ✅ Fix password admin: hapus seed sync yang overwrite password baru

#### Remaining TODO (Fase 8)
- 🔲 Error handling & recovery di semua halaman user
  - Camera disconnect mid-session
  - Network error saat payment/upload
  - Timeout handling
- 🔲 Loading states & skeleton screens
- 🔲 Keyboard support untuk voucher input (on-screen keyboard / native)
- 🔲 Konfigurasi countdown timer (3/5/10 detik, dari admin settings)
- 🔲 Auto-return timeout di Result page (configurable)
- 🔲 Session cleanup (hapus session lama otomatis)
- 🔲 Build & installer production (electron-builder)
- 🔲 App icon & splash screen
- 🔲 Final testing semua flow end-to-end

## Architecture Notes

### Branding Flow
```
App startup
  → loadBranding() [Zustand action]
    → admin:getSettings [IPC]
    → branding:getLogo + branding:getBgImage [IPC, parallel]
    → set branding state + brandingLoaded = true
  → render routes (setelah brandingLoaded)

Admin save branding
  → admin:saveSettings [IPC]
  → branding:uploadLogo / branding:uploadBgImage [IPC]
  → loadBranding() [refresh global state]
  → semua user pages langsung update
```

### Accent Color Scoping
```
:root (index.css)
  --brand-secondary: #e94560  ← default, used by admin panel & ModeSelect

Layout.jsx (user routes only: /idle, /payment, ...)
  style="--brand-secondary: {branding.primaryColor}"  ← override untuk user pages
  → semua child component pakai warna custom
  → admin panel tetap pakai default
```

### Navigation Guard (Admin)
```
AdminBrandingSettings
  → track dirty state (form vs savedForm, logo, bgImage)
  → useEffect → setAdminDirtyGuard(dirty) [Zustand]

AdminLayout sidebar
  → NavLink onClick: if (adminDirtyGuard) → e.preventDefault() → show dialog
  → Dialog: "Kembali & Simpan" / "Buang & Lanjut"
```
