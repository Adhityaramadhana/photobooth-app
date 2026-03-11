# Photobooth App — Project Reference

## Stack
| Layer | Tech |
|-------|------|
| Runtime | Electron 40 |
| Build tool | electron-vite 5 + Vite 7 |
| UI | React 18 |
| Styling | Tailwind CSS 3 |
| State | Zustand 4 |
| Routing | React Router DOM 6 (HashRouter) |
| Camera API | digiCamControl HTTP (port 5513) + Webcam/Mock |
| HTTP client (main) | node-fetch 2 (CJS) |
| Canvas editor & compositor | fabric.js 7 (ADMIN ONLY — bukan user flow) |
| Local DB | JSON files via fs (settings, voucher, transaksi di `userData/database`) |

## Critical Config Notes
- Config file: **`electron.vite.config.js`** (pakai titik, BUKAN `electron-vite.config.js`)
- `package.json` TIDAK pakai `"type": "module"` (supaya CJS output `.js` bukan `.cjs`)
- `postcss.config.js` pakai CJS syntax (`module.exports = {}`)
- Main & preload output di-force ke `entryFileNames: 'index.js'` agar match `package.json` `"main"`
- Entry points di-specify via `rollupOptions.input` (bukan `build.lib.entry`) karena electron-vite plugin auto-discovery cuma cari `src/main/index.js`
- Source files di `electron/` pakai ESM (`import/export`) — Rollup compile ke CJS

## Arsitektur: All-in-One Electron

Semua fitur (kiosk user + admin panel) ada dalam satu Electron app. Tidak ada web dashboard terpisah. Admin akses via AnyDesk/TeamViewer remote atau langsung di PC.

### Flow USER (touchscreen, fullscreen)
```
Mode Select (pilih User / Admin)
│ tap USER
▼ (masuk fullscreen)
Idle Screen (branding, tap untuk mulai)
│ tap layar
▼
Payment — pilih metode
├── QRIS/Cashless → tampil QR Midtrans + harga → polling paid
└── Voucher → input kode → validasi → gratis/diskon
│ terkonfirmasi
▼
Pilih Frame (grid frame, tap untuk pilih)
│ tap frame
▼
Foto Session (otomatis, multi-foto)
│  • Live view (preview seperti cermin)
│  • Timer 3-2-1 → 📸
│  • Background: rekam frames → GIF/boomerang
│  • Ulangi sesuai jumlah slot di frame
▼
Processing (otomatis, user tunggu)
│  • Composite foto ke dalam frame PNG
│  • Generate GIF dari live frames
│  • Upload ke cloud
│  • Print otomatis
▼
Hasil
│  • QR code di layar → user scan pakai HP
│  • Di HP: lihat / download foto, foto+frame, GIF
│  • Timeout → kembali ke Idle
▼
Idle Screen
```

**User TIDAK PERNAH:** memilih filter, drag elemen, resize apapun, menyentuh editor.

### Flow ADMIN (password protected, pakai mouse)
```
Mode Select (pilih Admin)
│ masuk AdminLogin (password)
▼
Admin Dashboard
├── Frame Manager      — buat/edit template frame (fabric.js, multi-layer)
├── Gallery            — lihat semua sesi foto + download
├── Transaksi          — riwayat pembayaran & sesi
├── Voucher Manager    — generate kode, set pakai/expiry
├── Payment Settings   — Midtrans API key, harga sesi
├── Printer Settings   — konfigurasi printer
└── Branding Settings  — nama studio, logo, warna
```

**Admin TIDAK FOTO, TIDAK BAYAR.**

## Routes (React Router — HashRouter)

### Entry & User Routes
| Path | Component | Navigasi |
|------|-----------|----------|
| `/` | ModeSelect | → `/idle` (User) atau `/admin/login` (Admin) |
| `/idle` | IdleScreen | → `/payment` (tap layar) |
| `/payment` | Payment | → `/select-frame` (bayar/voucher confirmed) |
| `/select-frame` | SelectFrame | → `/photo-session` (tap frame) |
| `/photo-session` | PhotoSession | → `/processing` (semua foto selesai) |
| `/processing` | Processing | → `/result` (selesai composite + upload + print) |
| `/result` | Result | → `/idle` (timeout / tap selesai) |

### Admin Routes
| Path | Component | Navigasi |
|------|-----------|----------|
| `/admin/login` | AdminLogin | → `/admin/frames` (password benar) |
| `/admin` | AdminLayout | layout + route guard (redirect ke `/admin/login` jika belum login) |
| `/admin/frames` | AdminFrameManager | kelola template frame + editor canvas |
| `/admin/gallery` | AdminGallery | lihat sesi foto & download |
| `/admin/transactions` | AdminTransactions | riwayat transaksi |
| `/admin/vouchers` | AdminVouchers | generate & manage kode voucher |
| `/admin/payment` | AdminPaymentSettings | Midtrans API key, harga |
| `/admin/printer` | AdminPrinterSettings | konfigurasi printer |
| `/admin/branding` | AdminBrandingSettings | nama studio, branding, PIN admin |
| `/admin/cloud` | AdminCloudSettings | konfigurasi Firebase Storage untuk upload hasil |

**Route guard:** Semua child route di bawah `/admin` cek `adminAuthenticated`. Jika belum login redirect ke `/admin/login`.

## Folder Structure
```
photobooth-app/
├── electron/
│   ├── main.js
│   ├── preload.js
│   └── handlers/
│       ├── cameraHandlers.js      # Camera IPC
│       ├── compositeHandlers.js   # Composite foto + frame
│       ├── gifHandlers.js         # Generate GIF
│       ├── printHandlers.js       # Print otomatis
│       ├── uploadHandlers.js      # Upload ke cloud + QR
│       ├── paymentHandlers.js     # Midtrans + voucher validasi
│       └── adminHandlers.js       # Frame CRUD, settings, gallery, transaksi, voucher
├── src/
│   ├── pages/
│   │   ├── ModeSelect.jsx         # Pilih User / Admin
│   │   ├── user/
│   │   │   ├── IdleScreen.jsx
│   │   │   ├── Payment.jsx        # Pilih metode → QRIS atau Voucher
│   │   │   ├── SelectFrame.jsx
│   │   │   ├── PhotoSession.jsx
│   │   │   ├── Processing.jsx
│   │   │   └── Result.jsx
│   │   └── admin/
│   │       ├── AdminLogin.jsx
│   │       ├── AdminFrameManager.jsx
│   │       ├── AdminGallery.jsx
│   │       ├── AdminTransactions.jsx
│   │       ├── AdminVouchers.jsx
│   │       ├── AdminPaymentSettings.jsx
│   │       ├── AdminPrinterSettings.jsx
│   │       ├── AdminBrandingSettings.jsx
│   │       └── AdminCloudSettings.jsx
│   ├── components/
│   │   ├── Layout.jsx             # User layout + exit button
│   │   ├── AdminLayout.jsx        # Admin layout + sidebar nav + logout
│   │   └── admin/editor/
│   │       ├── TemplateEditor.jsx # Main editor wrapper (save, load, layout state)
│   │       ├── EditorCanvas.jsx   # Fabric.js canvas (zoom via CSS transform)
│   │       ├── EditorToolbar.jsx  # Toolbar tambah layer (slot, bg, overlay, text)
│   │       ├── LayerPanel.jsx     # Layer list + visibility/lock toggle
│   │       ├── LayoutPanel.jsx    # Paper size, DPI, orientation picker
│   │       └── PropertiesPanel.jsx# Properties objek terpilih (posisi, warna, dll)
│   ├── store/
│   │   └── useAppStore.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── resources/                      # Asset default (boleh kosong di repo, dibuat/isi manual)
│   ├── mock/
│   │   └── sample-capture.jpg     # Contoh foto utk MOCK_MODE capture & GIF fallback
│   └── frames/
│       └── frame-xxx/             # Tiap frame tersimpan di folder sendiri
│           ├── frame.png          # Overlay untuk SelectFrame (auto-generate dari editor)
│           └── config.json        # Config template (v2) hasil Admin Frame Manager
├── database/
│   └── settings.json              # Seed: Midtrans key, harga, branding, printer, admin PIN, Firebase
├── index.html
├── electron.vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

### Frame Config Format (`resources/frames/frame-xxx/config.json`)
```json
{
  "id": "frame-001",
  "name": "Classic 4-Photo",
  "thumbnailSlot": 0,
  "slots": [
    { "x": 50, "y": 50, "width": 800, "height": 550 },
    { "x": 950, "y": 50, "width": 800, "height": 550 },
    { "x": 50, "y": 620, "width": 800, "height": 550 },
    { "x": 950, "y": 620, "width": 800, "height": 550 }
  ]
}
```

### Database Format (seed → disalin ke `userData/database/*.json`)

**`database/settings.json` (seed)** 
```json
{
  "midtrans": { "serverKey": "", "clientKey": "", "isProduction": false },
  "pricing": { "sessionPrice": 30000 },
  "printer": { "name": "", "copies": 1 },
  "branding": { "studioName": "Photobooth", "primaryColor": "#e94560" },
  "admin": { "password": "admin123" },
  "firebase": { "apiKey": "", "storageBucket": "" }
}
```
Di runtime:
- `userData/database/vouchers.json` dan `transactions.json` dibuat otomatis jika belum ada.
- Formatnya mengikuti contoh di bawah (satu array JSON).

**`vouchers.json` (runtime)**
```json
[
  { "code": "FREE001", "type": "free", "discount": 0, "usedCount": 0, "maxUse": 1, "expiresAt": null }
]
```

**`transactions.json` (runtime)** 
```json
[
  { "id": "sess-001", "timestamp": "", "method": "qris", "amount": 30000, "frame": "frame-001", "photoCount": 4 }
]
```

## Global State (Zustand — `useAppStore`)

### Session State
| Field | Type | Keterangan |
|-------|------|------------|
| `currentSession` | object\|null | Data sesi foto aktif |
| `currentSessionDir` | string\|null | Direktori output sesi |
| `capturedPhotos` | array | Path foto yang sudah diambil |
| `selectedFrame` | object\|null | Frame config yang dipilih user |
| `paymentStatus` | `'pending'`\|`'paid'`\|null | Status pembayaran |
| `paymentMethod` | `'qris'`\|`'voucher'`\|null | Metode pembayaran yang dipilih |
| `liveFrameBuffer` | array | Buffer frames untuk GIF |
| `resultQrUrl` | string\|null | URL hasil di cloud (untuk QR) |
| `resultQrImage` | string\|null | DataURL PNG QR code yang ditampilkan di Result |
| `processingStep` | string\|null | Step processing aktif |

### Camera State
| Field | Type | Keterangan |
|-------|------|------------|
| `cameraStatus` | `'disconnected'`\|`'connecting'`\|`'connected'`\|`'error'` | Status koneksi |
| `cameraModel` | string\|null | Nama model kamera |
| `liveViewActive` | boolean | Live view sedang aktif |
| `liveViewFrameUrl` | string\|null | URL frame live view |
| `isMockMode` | boolean | Ikutin MOCK_MODE di handler |

### Admin State
| Field | Type | Keterangan |
|-------|------|------------|
| `adminAuthenticated` | boolean | Apakah admin sudah login |

## IPC Bridge
```
Renderer (window.electronAPI.xxx)
  → preload.js (contextBridge)
    → main.js (ipcMain.handle)
      → handlers/
```

### Available IPC Methods
| Channel | Handler | Response (utama) |
|---------|---------|------------------|
| `ping` | `main.js` | `'pong'` |
| `app:getSessionDir` | `main.js` | path direktori sesi baru (`userData/sessions/<timestamp>`) |
| `app:readFileAsDataUrl` | `main.js` | DataURL file gambar (dipakai di Result) |
| `camera:checkService` | `cameraHandlers` | `{ running, mock?: boolean }` |
| `camera:getList` | `cameraHandlers` | `{ cameras[] }` |
| `camera:connect` | `cameraHandlers` | `{ success, model, mock?, webcam? }` |
| `camera:startLiveView` | `cameraHandlers` | `{ success, framePath?, mock?, webcam? }` |
| `camera:stopLiveView` | `cameraHandlers` | `{ success }` |
| `camera:capture` | `cameraHandlers` | `{ success, filePath }` (DSLR / MOCK_MODE) |
| `camera:saveWebcamFrame` | `cameraHandlers` | `{ success, filePath }` (snapshot webcam dari renderer) |
| `camera:saveLiveFrame` | `cameraHandlers` | `{ success, filePath }` (frame untuk GIF/boomerang) |
| `camera:startHealthCheck` | `cameraHandlers` | start interval health check (kirim event `camera:disconnected`) |
| `camera:stopHealthCheck` | `cameraHandlers` | stop interval |
| `frame:getList` | `adminHandlers` | `{ frames[] }` (baca semua `config.json` dan normalisasi slots) |
| `frame:getConfig` | `adminHandlers` | `{ config }` (untuk TemplateEditor) |
| `frame:saveConfig` | `adminHandlers` | `{ success }` |
| `frame:uploadPng` | `adminHandlers` | `{ success, frameId }` (simpan preview PNG overlay) |
| `frame:delete` | `adminHandlers` | `{ success }` |
| `frame:getPng` | `adminHandlers` | `{ data }` (DataURL PNG overlay) |
| `frame:uploadAsset` | `adminHandlers` | `{ success }` (simpan asset tambahan ke `assets/`) |
| `frame:getAsset` | `adminHandlers` | `{ data }` (DataURL asset) |
| `frame:listAssets` | `adminHandlers` | `{ assets[] }` |
| `frame:deleteAsset` | `adminHandlers` | `{ success }` |
| `admin:verifyPassword` | `adminHandlers` | `{ success }` (cek PIN admin) |
| `admin:getSettings` | `adminHandlers` | `{ settings }` (bootstrap dari seed jika belum ada) |
| `admin:saveSettings` | `adminHandlers` | `{ success }` |
| `admin:getGallery` | `adminHandlers` | `{ sessions[] }` (scan `userData/sessions`) |
| `admin:getTransactions` | `adminHandlers` | `{ transactions[] }` |
| `db:logTransaction` | `adminHandlers` | `{ success }` (prepend transaksi baru) |
| `admin:getVouchers` | `adminHandlers` | `{ vouchers[] }` |
| `admin:saveVoucher` | `adminHandlers` | `{ success }` |
| `admin:deleteVoucher` | `adminHandlers` | `{ success }` |
| `voucher:validate` | `adminHandlers` | `{ valid, type, discount, error? }` (auto update `usedCount`) |
| `payment:createOrder` | `paymentHandlers` | `{ success, orderId, qrImageBase64, mock? }` |
| `payment:checkStatus` | `paymentHandlers` | `{ paid, mock? }` |
| `composite:run` | `compositeHandlers` | `{ success, filePath }` (hasil composite PNG/JPG) |
| `gif:generate` | `gifHandlers` | `{ success, filePath }` (GIF dari live-frames) |
| `gif:generateBoomerang` | `gifHandlers` | `{ success, filePath }` (GIF boomerang) |
| `upload:toCloud` | `uploadHandlers` | `{ success, qrUrl, qrImageBase64 }` |
| `print:send` | `printHandlers` | `{ success }` |

### Events (main → renderer)
| Event | Trigger |
|-------|---------|
| `camera:disconnected` | Health check fails 3x |

## Camera Modes (Mock & Webcam)
- Toggle ada di `electron/handlers/cameraHandlers.js`:
  - `WEBCAM_MODE = true` → pakai webcam lokal via `getUserMedia` (dev/testing termudah).
  - `MOCK_MODE = true` → pakai gambar statis dari internet, capture dari file sample.
  - Keduanya `false` → mode DSLR real via digiCamControl HTTP.
- Mock details:
  - Mock model: `Canon EOS 800D (Mock)`
  - Live view (MOCK_MODE): gambar statis dari `https://picsum.photos/800/1200`
  - Capture (MOCK_MODE): copy `resources/mock/sample-capture.jpg` ke session dir (delay 2s).
- Webcam mode:
  - Live view & capture dilakukan di renderer (canvas + `getUserMedia`), hasil snapshot dikirim ke main lewat `camera:saveWebcamFrame` / `camera:saveLiveFrame`.
- Health check hanya aktif di mode DSLR real (bukan mock/webcam).

## Electron Security
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: false` (diperlukan untuk preload)
- Hanya expose method spesifik via `contextBridge`
- JANGAN akses `localhost:5513` dari React langsung — wajib lewat IPC

## Scripts
```bash
npm run dev        # Dev mode (Electron + Vite HMR)
npm run build      # Build production
npm run build:win  # Build installer Windows
```

## Tailwind Brand Colors
| Token | Hex | Penggunaan |
|-------|-----|------------|
| `brand-primary` | `#1a1a2e` | Background utama |
| `brand-secondary` | `#e94560` | Tombol aksi / aksen |
| `brand-surface` | `#16213e` | Card / panel |
| `brand-text` | `#eaeaea` | Teks utama |

## Admin Frame Manager (fabric.js v7)
- **ADMIN ONLY**
- Editor full template (bukan cuma slot):
  - Canvas size fleksibel, ditentukan oleh layout:
    - Paper presets: 2x6, 4x6, 5x7, 6x8, 6x9, 8x10, dll (`PAPER_PRESETS`).
    - DPI default 300, orientation vertical/horizontal.
  - Layer types:
    - `background` (gambar latar penuh).
    - `overlay` (frame dekoratif di atas slot).
    - `photo-slot` (rect area tempat foto user di-composite).
    - `static-text` dan `dynamic-text` (tanggal, waktu, session id, studio name).
- Flow kerja:
  - Admin pilih / buat template frame di `AdminFrameManager`.
  - Klik "Edit" → buka `TemplateEditor`:
    - Canvas centre, kiri: Layer list + Layout panel, kanan: Properties panel.
    - Toolbar bisa tambah slot, background, overlay, teks statis/dinamis, dll.
  - Editor otomatis me-resize view:
    - Fabric canvas tetap di ukuran pixel aslinya (misal 1200x1800).
    - Zoom hanya lewat CSS scaling (tidak mengubah coordinate system).
  - Saat Save:
    - `buildTemplateConfig(canvas, meta)` → `config.version = 2`:
      - `canvas`: width, height, dpi, orientation, paperSize, backgroundColor.
      - `layers`: semua objek dengan properti tambahan (`layerRole`, `slotIndex`, dll).
      - `fabricJson`: JSON penuh untuk restore 1:1.
    - `config.slots` diisi ulang berdasar layer `photo-slot`. Jika overlay/background keluar batas canvas (OOB), posisi slot di-transform otomatis (`slotTransform`) supaya tetap align saat composite.
    - `frame:saveConfig` menulis `config.json`.
    - Editor sembunyikan slot + background transparent + auto-fit overlay/background (jika OOB, di-cover-scale ke canvas) → export PNG via `canvas.toDataURL()` → `frame:uploadPng`.
    - PNG ini dipakai di halaman `SelectFrame` sebagai overlay, sementara slot dipakai untuk posisi foto saat composite.
    - Logika OOB + slotTransform yang sama juga ada di `compositeHandlers.js` saat rendering.

## PhotoSession — Background Live Frame Recording
- Saat countdown berjalan, renderer merekam frame live view (webcam/DSLR) tiap ~200ms.
- Frame disimpan via `camera:saveLiveFrame` ke:
  - `sessionDir/live-frames/photo-N/frame-XXXX.jpg`
- Setelah semua foto selesai:
  - Halaman `Processing` memanggil:
    - `gif:generate` → GIF utama.
    - `gif:generateBoomerang` → GIF boomerang (forward + reverse).
- User hanya lihat: live view + countdown + flash 📸 (tanpa tahu proses background).

## PhotoSession — Mirror / Flip Horizontal (Webcam Mode)
- Live view preview di-mirror via CSS `style={{ transform: 'scaleX(-1)' }}` pada `<img>`.
- Hasil capture & live frame recording juga di-mirror supaya konsisten:
  - Sebelum `drawImage(video, ...)` ke canvas, apply `ctx.translate(width, 0); ctx.scale(-1, 1)`.
  - Berlaku untuk: `snapCanvas` (capture foto) dan `webcamCanvasRef` (frame GIF recording).
- Efek: jempol kiri ke kamera → jempol kiri di preview → jempol kiri di hasil foto & GIF.

## Phase Status
- **Fase 1** ✅ — Skeleton project, routing, store, IPC ping
- **Fase 2** ✅ — Camera handlers (mock/webcam/DSLR), halaman lama diganti flow baru
- **Fase 3** ✅ — Editor fabric.js v7 (Admin Frame Manager, template v2)
- **Fase 4** ✅ — Restructure UI: ModeSelect, user flow baru, exit button, store update
- **Fase 5** ✅ — Admin flow: Login, sidebar dashboard, Frame Manager, Gallery, Transaksi, Voucher, Settings (Payment/Printer/Branding/Cloud)
- **Fase 6** ✅ — Composite, GIF + Boomerang generation, print, cloud upload, QR result
- **Fase 7** ✅ — Payment: Midtrans QRIS (mock & real) + Voucher system
- **Fase 8** 🔲 — Polish final, hardening, error handling, build/installer production

### Fixes & Polish yang sudah done (post-fase 7)
- ✅ Webcam capture & GIF frame recording di-mirror horizontal (konsisten dengan live view preview)

- JANGAN install: `fluent-ffmpeg`, `better-sqlite3`, `napi-canon-cameras`
