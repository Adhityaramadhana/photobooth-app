# Photobooth App — Project Reference

## Stack
| Layer | Tech |
|-------|------|
| Runtime | Electron 29 |
| Build tool | electron-vite 2.3 |
| UI | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 |
| State | Zustand 4 |
| Routing | React Router DOM 6 (HashRouter) |
| Camera API | digiCamControl HTTP (port 5513) |
| HTTP client (main) | node-fetch 2 (CJS) |
| Canvas compositor | fabric.js 7 (ADMIN ONLY — bukan user flow) |
| Local DB | JSON files via fs (settings, voucher, transaksi) |

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
├── Frame Manager      — upload PNG, atur posisi slot (fabric.js)
├── Gallery            — lihat semua sesi foto + download
├── Transaksi          — riwayat pembayaran & sesi
├── Voucher Manager    — generate kode, set pakai/expiry
├── Payment Settings   — Midtrans API key, harga sesi
├── Printer Settings   — konfigurasi printer
└── Branding Settings  — nama studio, logo, warna
```

**Admin TIDAK FOTO, TIDAK BAYAR.**

## Routes (React Router — HashRouter)

### Entry
| Path | Component | Navigasi |
|------|-----------|----------|
| `/` | ModeSelect | → `/idle` (User) atau `/admin` (Admin) |

### User Routes
| Path | Component | Navigasi |
|------|-----------|----------|
| `/idle` | IdleScreen | → `/payment` (tap layar) |
| `/payment` | Payment | → `/select-frame` (bayar/voucher confirmed) |
| `/select-frame` | SelectFrame | → `/photo-session` (tap frame) |
| `/photo-session` | PhotoSession | → `/processing` (semua foto selesai) |
| `/processing` | Processing | → `/result` (selesai composite + upload) |
| `/result` | Result | → `/idle` (timeout / tap selesai) |

### Admin Routes
| Path | Component | Navigasi |
|------|-----------|----------|
| `/admin` | AdminLogin | → `/admin/dashboard` (password benar) |
| `/admin/dashboard` | AdminDashboard | hub ke semua sub-menu |
| `/admin/frames` | AdminFrameManager | editor posisi slot di frame |
| `/admin/gallery` | AdminGallery | lihat sesi foto & download |
| `/admin/transactions` | AdminTransactions | riwayat transaksi |
| `/admin/vouchers` | AdminVouchers | generate & manage kode voucher |
| `/admin/payment` | AdminPaymentSettings | Midtrans API key, harga |
| `/admin/printer` | AdminPrinterSettings | konfigurasi printer |
| `/admin/branding` | AdminBrandingSettings | nama studio, logo, warna |

**Route guard:** Admin routes cek auth state. Jika belum login redirect ke `/admin`.

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
│   │       ├── AdminDashboard.jsx
│   │       ├── AdminFrameManager.jsx
│   │       ├── AdminGallery.jsx
│   │       ├── AdminTransactions.jsx
│   │       ├── AdminVouchers.jsx
│   │       ├── AdminPaymentSettings.jsx
│   │       ├── AdminPrinterSettings.jsx
│   │       └── AdminBrandingSettings.jsx
│   ├── components/
│   │   ├── Layout.jsx             # User layout + exit button
│   │   └── AdminLayout.jsx        # Admin layout + sidebar nav + logout
│   ├── store/
│   │   └── useAppStore.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── resources/
│   ├── mock/
│   │   └── sample-capture.jpg
│   └── frames/
│       ├── frame-001/
│       │   ├── frame.png
│       │   └── config.json
│       └── frame-002/
│           ├── frame.png
│           └── config.json
├── database/
│   ├── settings.json              # Midtrans key, harga, branding, printer
│   ├── vouchers.json              # Daftar kode voucher
│   └── transactions.json          # Log transaksi
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

### Database Format

**`database/settings.json`**
```json
{
  "midtrans": { "serverKey": "", "clientKey": "", "isProduction": false },
  "pricing": { "sessionPrice": 30000 },
  "printer": { "name": "", "copies": 1 },
  "branding": { "studioName": "Photobooth", "primaryColor": "#e94560" }
}
```

**`database/vouchers.json`**
```json
[
  { "code": "FREE001", "type": "free", "usedCount": 0, "maxUse": 1, "expiresAt": null }
]
```

**`database/transactions.json`**
```json
[
  { "id": "sess-001", "timestamp": "", "method": "qris", "amount": 30000, "frame": "frame-001", "photos": [] }
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
| `resultQrUrl` | string\|null | URL QR code hasil upload |
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
| Channel | Handler | Response |
|---------|---------|----------|
| `ping` | `main.js` | `'pong'` |
| `camera:checkService` | `cameraHandlers` | `{ running, mock? }` |
| `camera:getList` | `cameraHandlers` | `{ cameras[] }` |
| `camera:connect` | `cameraHandlers` | `{ success, model }` |
| `camera:startLiveView` | `cameraHandlers` | `{ success }` |
| `camera:stopLiveView` | `cameraHandlers` | `{ success }` |
| `camera:capture` | `cameraHandlers` | `{ success, filePath }` |
| `camera:startHealthCheck` | `cameraHandlers` | starts interval |
| `camera:stopHealthCheck` | `cameraHandlers` | clears interval |
| `app:getSessionDir` | `main.js` | session directory path |
| `frame:getList` | `adminHandlers` | `{ frames[] }` |
| `frame:getConfig` | `adminHandlers` | `{ config }` |
| `frame:saveConfig` | `adminHandlers` | `{ success }` |
| `frame:uploadPng` | `adminHandlers` | `{ success, frameId }` |
| `frame:delete` | `adminHandlers` | `{ success }` |
| `composite:run` | `compositeHandlers` | `{ success, filePath }` |
| `gif:generate` | `gifHandlers` | `{ success, filePath }` |
| `print:send` | `printHandlers` | `{ success }` |
| `upload:toCloud` | `uploadHandlers` | `{ success, qrUrl }` |
| `payment:createOrder` | `paymentHandlers` | `{ success, qrUrl, orderId }` |
| `payment:checkStatus` | `paymentHandlers` | `{ paid: boolean }` |
| `voucher:validate` | `paymentHandlers` | `{ valid, type }` |
| `admin:verifyPassword` | `adminHandlers` | `{ success }` |
| `admin:getSettings` | `adminHandlers` | `{ settings }` |
| `admin:saveSettings` | `adminHandlers` | `{ success }` |
| `admin:getGallery` | `adminHandlers` | `{ sessions[] }` |
| `admin:getTransactions` | `adminHandlers` | `{ transactions[] }` |
| `admin:getVouchers` | `adminHandlers` | `{ vouchers[] }` |
| `admin:saveVoucher` | `adminHandlers` | `{ success }` |
| `admin:deleteVoucher` | `adminHandlers` | `{ success }` |
| `db:logTransaction` | `adminHandlers` | `{ success }` |

### Events (main → renderer)
| Event | Trigger |
|-------|---------|
| `camera:disconnected` | Health check fails 3x |

## Mock Mode
- Toggle: `MOCK_MODE = true` di `electron/handlers/cameraHandlers.js`
- Mock model: `Canon EOS 800D (Mock)`
- Live view: gambar statis dari `https://picsum.photos/1280/800`
- Capture: copy `resources/mock/sample-capture.jpg` ke session dir (delay 2s)
- Health check: skipped di mock mode

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
- Canvas size: 1800x1200
- Admin upload frame PNG → background canvas
- Admin drag & drop rectangle → posisi slot foto
- Setiap rectangle = 1 slot (`x, y, width, height`)
- Simpan → `config.json` via IPC `frame:saveConfig`
- fabric.js v7 API: `new fabric.Canvas()`, `new fabric.Rect()`, `canvas.dispose()`

## PhotoSession — Background Live Frame Recording
- Saat countdown berjalan, simpan frame live view tiap ~100ms
- Frame disimpan ke `sessionDir/live-frames/foto-N/frame-XXX.jpg`
- Setelah semua foto selesai → `gif:generate` dari Processing page
- User hanya lihat: live view + countdown + flash 📸

## Phase Status
- **Fase 1** ✅ — Skeleton project, routing, store, IPC ping
- **Fase 2** ✅ — Camera handlers (mock), halaman lama (sudah diganti)
- **Fase 3** ✅ — Editor fabric.js (dipindah ke Admin Flow)
- **Fase 4** ✅ — Restructure UI: ModeSelect, user flow baru, exit button, store update
- **Fase 5** 🔲 — Admin flow: Login, Dashboard + sidebar, Frame Manager, Gallery, Transaksi, Voucher, Settings
- **Fase 6** 🔲 — Composite, GIF generation, print, cloud upload, QR result
- **Fase 7** 🔲 — Payment: Midtrans QRIS + Voucher system
- **Fase 8** 🔲 — Polish, error handling, build production

- JANGAN install: `fluent-ffmpeg`, `better-sqlite3`, `napi-canon-cameras`
