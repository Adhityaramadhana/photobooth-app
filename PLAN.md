# Restructure Plan — Pemisahan Flow User & Admin

## Masalah
Flow sekarang salah: `Home → LiveMode → ShutterMode → Editor → Payment → Delivery`
- User & Admin campur jadi satu
- Editor (fabric.js) seharusnya tool admin, bukan user
- Payment harusnya setelah idle, bukan setelah editor
- LiveMode harusnya background process, bukan halaman terpisah

## Flow yang Benar

### USER Flow (touchscreen kiosk, tanpa keyboard/mouse)
```
Idle Screen → tap → Payment (QRIS) → Pilih Frame → Foto Session (auto) → Processing → Hasil (QR) → Idle
```

### ADMIN Flow (password protected, pakai mouse)
```
Password → Dashboard → Frame Manager | Payment Settings | Printer Settings | Branding
```

## Perubahan yang Dilakukan

### 1. Update CLAUDE.md
- Hapus dokumentasi flow lama
- Tulis flow baru (user & admin terpisah)
- Update folder structure, routes, store schema
- Update IPC methods yang berubah

### 2. Restructure Halaman (src/pages/)

**Hapus:**
- `Home.jsx` → ganti jadi `IdleScreen.jsx`
- `LiveMode.jsx` → hapus (jadi background di PhotoSession)

**Rename/Ubah total:**
- `ShutterMode.jsx` → ganti jadi `PhotoSession.jsx` (multi-foto + live recording background)
- `Editor.jsx` → pindah ke `admin/FrameEditor.jsx` (admin-only)
- `Payment.jsx` → tetap tapi pindah posisi di flow (setelah idle)
- `Delivery.jsx` → ganti jadi `Results.jsx` (QR code + auto print)

**Buat baru:**
- `PickFrame.jsx` — grid frame untuk user pilih
- `Processing.jsx` — layar tunggu (composite + upload + print)
- `admin/AdminLogin.jsx` — password gate
- `admin/AdminDashboard.jsx` — menu admin
- `admin/FrameEditor.jsx` — fabric.js canvas (dari Editor.jsx lama)

### 3. Update Routes (App.jsx)

```
USER ROUTES:
/                → IdleScreen
/payment         → Payment (QRIS)
/pick-frame      → PickFrame
/session         → PhotoSession (multi-foto + background recording)
/processing      → Processing (composite, upload, print)
/results         → Results (QR code)

ADMIN ROUTES:
/admin           → AdminLogin
/admin/dashboard → AdminDashboard
/admin/frames    → FrameEditor (fabric.js)
```

### 4. Update Zustand Store (useAppStore.js)

**Tambah:**
- `appMode`: `'user'` | `'admin'`
- `selectedFrameData`: object dengan info rectangles dari admin
- `sessionPhotos`: array of { index, photoPath, gifFrames[] }
- `currentPhotoIndex`: number (foto ke berapa dalam session)
- `totalPhotos`: number (jumlah rectangle di frame)
- `sessionPhase`: `'idle'` | `'payment'` | `'pick-frame'` | `'session'` | `'processing'` | `'results'`

**Hapus/Ubah:**
- `deliveryMethod` → hapus (delivery otomatis QR + print)
- `liveViewFrameUrl` → tetap tapi konteksnya berubah

### 5. Halaman Baru — Detail

**IdleScreen.jsx:**
- Fullscreen branding (logo + nama studio)
- Tap anywhere → navigate ke /payment
- Hidden: ketuk 5x pojok kanan atas → buka /admin

**PickFrame.jsx:**
- Grid thumbnail frame dari `editor:getFrameCategories`
- Tap frame → simpan ke store → navigate ke /session
- Info: "Frame ini punya X slot foto"

**PhotoSession.jsx (gabungan LiveMode + ShutterMode):**
- Loop N kali (sesuai jumlah rectangle di frame)
- Tiap loop:
  1. Live camera preview (cermin)
  2. Timer countdown (configurable: 3/5/10 detik)
  3. 2-3 detik terakhir: background save live view frames → untuk GIF
  4. Capture foto
  5. Brief preview (1-2 detik)
  6. Lanjut ke foto berikutnya atau selesai
- Otomatis navigate ke /processing setelah semua foto selesai

**Processing.jsx:**
- "Sedang memproses foto..."
- Composite semua foto ke dalam frame (sesuai rectangle positions)
- Generate GIF dari saved frames
- Upload ke cloud
- Print otomatis
- Navigate ke /results

**Results.jsx:**
- QR code di layar → user scan di HP
- Countdown timeout (30 detik?) → auto kembali ke idle
- Tombol "Selesai" → clearSession → navigate /

### 6. Yang TIDAK berubah
- electron/main.js — IPC registration tetap (tambah handler baru nanti)
- electron/preload.js — tambah method baru nanti
- electron/handlers/cameraHandlers.js — tetap
- electron/handlers/editorHandlers.js — tetap (dipakai admin)
- resources/ — tetap
- Config files — tetap
- Tailwind — tetap

### 7. Urutan Eksekusi
1. Update CLAUDE.md dulu (dokumentasi baru)
2. Buat folder `src/pages/admin/`
3. Buat `IdleScreen.jsx` (ganti Home.jsx)
4. Update `Payment.jsx` (posisi baru di flow)
5. Buat `PickFrame.jsx`
6. Buat `PhotoSession.jsx` (gabung LiveMode + ShutterMode)
7. Buat `Processing.jsx` (stub dulu)
8. Buat `Results.jsx` (ganti Delivery.jsx)
9. Pindah `Editor.jsx` → `admin/FrameEditor.jsx`
10. Buat `admin/AdminLogin.jsx`
11. Buat `admin/AdminDashboard.jsx`
12. Update `App.jsx` — routes baru
13. Update `useAppStore.js` — state baru
14. Hapus `Home.jsx`, `LiveMode.jsx` yang lama
15. Test dev server
