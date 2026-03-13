import fs from 'fs'
import path from 'path'
import { app } from 'electron'

// ── Paths ─────────────────────────────────────────────────────────────────────

const dbDir = () => {
  const dir = path.join(app.getPath('userData'), 'database')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

const settingsPath = () => path.join(dbDir(), 'settings.json')
const vouchersPath = () => path.join(dbDir(), 'vouchers.json')
const transactionsPath = () => path.join(dbDir(), 'transactions.json')
const framesDir = () => path.join(__dirname, '../../resources/frames')

// ── JSON helpers ──────────────────────────────────────────────────────────────

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return fallback
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// ── Default settings ──────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  midtrans: { serverKey: '', clientKey: '', isProduction: false },
  pricing: { sessionPrice: 30000 },
  printer: { name: '', copies: 1 },
  branding: { studioName: 'Photobooth', primaryColor: '#e94560', tagline: '', bgColor: '', logoFile: '', bgImageFile: '', layoutTemplate: 'centered', showLogoPersistent: false, decorativePreset: 'none', bgOverlayOpacity: 0 },
  admin: { password: 'admin123' },
  firebase: { apiKey: '', storageBucket: '' }
}

function ensureSettings() {
  const p = settingsPath()
  if (!fs.existsSync(p)) {
    const seedPath = path.join(__dirname, '../../database/settings.json')
    if (fs.existsSync(seedPath)) {
      fs.copyFileSync(seedPath, p)
    } else {
      writeJson(p, DEFAULT_SETTINGS)
    }
  }
  return readJson(p, DEFAULT_SETTINGS)
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function verifyPassword(password) {
  const settings = ensureSettings()
  const correct = settings?.admin?.password ?? '1234'
  return { success: password === correct }
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function getSettings() {
  return { settings: ensureSettings() }
}

export function saveSettings(newSettings) {
  try {
    const current = ensureSettings()
    const merged = { ...current, ...newSettings }
    writeJson(settingsPath(), merged)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ── Frame Management ──────────────────────────────────────────────────────────

export function getFrameList() {
  try {
    const dir = framesDir()
    if (!fs.existsSync(dir)) return { frames: [] }

    const frames = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const cfgPath = path.join(dir, d.name, 'config.json')
        const config = readJson(cfgPath, null)
        if (!config) return null

        // v2 config: extract slots from layers
        const cw = config.canvas?.width  || 1200
        const ch = config.canvas?.height || 1800
        let slots = config.slots ?? []
        if (config.version === 2 && config.layers) {
          slots = config.layers
            .filter(l => l.layerRole === 'photo-slot')
            .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
            .map(l => ({ x: l.left, y: l.top, width: l.width, height: l.height }))

          // If the overlay extends beyond canvas, the admin placed slots relative
          // to the over-scaled overlay. Transform slot positions so they match the
          // auto-fitted overlay in the exported frame PNG.
          const overlay = config.layers.find(l =>
            l.layerRole === 'overlay' || l.layerRole === 'background'
          )
          if (overlay) {
            const ol = overlay.left || 0
            const ot = overlay.top  || 0
            const ow = overlay.width  || cw
            const oh = overlay.height || ch
            const oob = ol < -2 || ot < -2 || ol + ow > cw + 2 || ot + oh > ch + 2
            if (oob && ow > 0 && oh > 0) {
              slots = slots.map(s => ({
                x: Math.round((s.x - ol) * cw / ow),
                y: Math.round((s.y - ot) * ch / oh),
                width:  Math.round(s.width  * cw / ow),
                height: Math.round(s.height * ch / oh),
              }))
            }
          }

          // Final safety clamp to canvas bounds
          slots = slots
            .map(s => ({
              x: Math.max(0, s.x),
              y: Math.max(0, s.y),
              width:  Math.min(s.width,  cw - Math.max(0, s.x)),
              height: Math.min(s.height, ch - Math.max(0, s.y)),
            }))
            .filter(s => s.width > 10 && s.height > 10)
        }

        return {
          id: d.name,
          name: config.name ?? d.name,
          slots,
          thumbnailSlot: config.thumbnailSlot ?? 0,
          version: config.version ?? 1,
          // Canvas dimensions (v2 only) — used by SelectFrame when no frame.png exists yet
          canvasWidth:  config.version === 2 ? cw : null,
          canvasHeight: config.version === 2 ? ch : null,
        }
      })
      .filter(Boolean)

    return { frames }
  } catch (err) {
    return { frames: [], error: err.message }
  }
}

export function getFrameConfig(frameId) {
  try {
    const cfgPath = path.join(framesDir(), frameId, 'config.json')
    const config = readJson(cfgPath, null)
    if (!config) return { config: null, error: 'Frame not found' }
    return { config }
  } catch (err) {
    return { config: null, error: err.message }
  }
}

export function saveFrameConfig(frameId, config) {
  try {
    const frameDir = path.join(framesDir(), frameId)
    fs.mkdirSync(frameDir, { recursive: true })
    writeJson(path.join(frameDir, 'config.json'), config)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export function uploadFramePng(frameId, base64Data) {
  try {
    const frameDir = path.join(framesDir(), frameId)
    fs.mkdirSync(frameDir, { recursive: true })
    const raw = base64Data.replace(/^data:image\/\w+;base64,/, '')
    fs.writeFileSync(path.join(frameDir, 'frame.png'), Buffer.from(raw, 'base64'))
    return { success: true, frameId }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export function deleteFrame(frameId) {
  try {
    const frameDir = path.join(framesDir(), frameId)
    if (fs.existsSync(frameDir)) {
      fs.rmSync(frameDir, { recursive: true, force: true })
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export function getFramePng(frameId) {
  try {
    const pngPath = path.join(framesDir(), frameId, 'frame.png')
    if (!fs.existsSync(pngPath)) return { data: null }
    const buffer = fs.readFileSync(pngPath)
    return { data: `data:image/png;base64,${buffer.toString('base64')}` }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

// ── Gallery ───────────────────────────────────────────────────────────────────

export function getGallery() {
  try {
    const sessionsDir = path.join(app.getPath('userData'), 'sessions')
    if (!fs.existsSync(sessionsDir)) return { sessions: [] }

    const sessions = fs.readdirSync(sessionsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const sessionPath = path.join(sessionsDir, d.name)
        const photos = fs.readdirSync(sessionPath)
          .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
          .map(f => path.join(sessionPath, f))
        return {
          id: d.name,
          timestamp: parseInt(d.name) || 0,
          photos,
          photoCount: photos.length
        }
      })
      .filter(s => s.photoCount > 0)
      .sort((a, b) => b.timestamp - a.timestamp)

    return { sessions }
  } catch (err) {
    return { sessions: [], error: err.message }
  }
}

// ── Transactions ──────────────────────────────────────────────────────────────

export function getTransactions() {
  const p = transactionsPath()
  if (!fs.existsSync(p)) {
    const seed = path.join(__dirname, '../../database/transactions.json')
    if (fs.existsSync(seed)) fs.copyFileSync(seed, p)
  }
  return { transactions: readJson(p, []) }
}

export function logTransaction(data) {
  try {
    const list = readJson(transactionsPath(), [])
    list.unshift({ ...data, id: `tx-${Date.now()}`, timestamp: new Date().toISOString() })
    writeJson(transactionsPath(), list)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ── Vouchers ──────────────────────────────────────────────────────────────────

export function getVouchers() {
  const p = vouchersPath()
  if (!fs.existsSync(p)) {
    const seed = path.join(__dirname, '../../database/vouchers.json')
    if (fs.existsSync(seed)) fs.copyFileSync(seed, p)
  }
  return { vouchers: readJson(p, []) }
}

export function saveVoucher(voucher) {
  try {
    const list = readJson(vouchersPath(), [])
    const idx = list.findIndex(v => v.code === voucher.code)
    if (idx >= 0) {
      list[idx] = voucher
    } else {
      list.push(voucher)
    }
    writeJson(vouchersPath(), list)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export function deleteVoucher(code) {
  try {
    const list = readJson(vouchersPath(), [])
    writeJson(vouchersPath(), list.filter(v => v.code !== code))
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ── Frame Asset Management (images for template layers) ──────────────────────

export function uploadFrameAsset(frameId, fileName, base64Data) {
  try {
    const assetsDir = path.join(framesDir(), frameId, 'assets')
    fs.mkdirSync(assetsDir, { recursive: true })
    const raw = base64Data.replace(/^data:image\/\w+;base64,/, '')
    fs.writeFileSync(path.join(assetsDir, fileName), Buffer.from(raw, 'base64'))
    return { success: true, fileName }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export function getFrameAsset(frameId, fileName) {
  try {
    const filePath = path.join(framesDir(), frameId, 'assets', fileName)
    if (!fs.existsSync(filePath)) return { data: null }
    const buffer = fs.readFileSync(filePath)
    const ext = path.extname(fileName).toLowerCase()
    const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png'
    return { data: `data:${mime};base64,${buffer.toString('base64')}` }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

export function listFrameAssets(frameId) {
  try {
    const assetsDir = path.join(framesDir(), frameId, 'assets')
    if (!fs.existsSync(assetsDir)) return { files: [] }
    const files = fs.readdirSync(assetsDir).filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
    return { files }
  } catch (err) {
    return { files: [], error: err.message }
  }
}

export function deleteFrameAsset(frameId, fileName) {
  try {
    const filePath = path.join(framesDir(), frameId, 'assets', fileName)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ── Branding Assets (logo & background image) ────────────────────────────────

const brandingAssetsDir = () => {
  const dir = path.join(app.getPath('userData'), 'database', 'branding')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function uploadBrandingLogo(base64Data) {
  try {
    const dir = brandingAssetsDir()
    const raw = base64Data.replace(/^data:image\/\w+;base64,/, '')
    fs.writeFileSync(path.join(dir, 'logo.png'), Buffer.from(raw, 'base64'))

    const settings = ensureSettings()
    settings.branding = { ...settings.branding, logoFile: 'logo.png' }
    writeJson(settingsPath(), settings)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export function getBrandingLogo() {
  try {
    const filePath = path.join(brandingAssetsDir(), 'logo.png')
    if (!fs.existsSync(filePath)) return { data: null }
    const buffer = fs.readFileSync(filePath)
    return { data: `data:image/png;base64,${buffer.toString('base64')}` }
  } catch {
    return { data: null }
  }
}

export function deleteBrandingLogo() {
  try {
    const filePath = path.join(brandingAssetsDir(), 'logo.png')
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    const settings = ensureSettings()
    settings.branding = { ...settings.branding, logoFile: '' }
    writeJson(settingsPath(), settings)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export function uploadBrandingBgImage(base64Data) {
  try {
    const dir = brandingAssetsDir()
    const match = base64Data.match(/^data:image\/(\w+);base64,/)
    const ext = match ? match[1].replace('jpeg', 'jpg') : 'png'
    const fileName = `bg-image.${ext}`
    const raw = base64Data.replace(/^data:image\/\w+;base64,/, '')

    // Remove any existing bg-image files with different extensions
    fs.readdirSync(dir).filter(f => f.startsWith('bg-image.')).forEach(f => {
      fs.unlinkSync(path.join(dir, f))
    })

    fs.writeFileSync(path.join(dir, fileName), Buffer.from(raw, 'base64'))

    const settings = ensureSettings()
    settings.branding = { ...settings.branding, bgImageFile: fileName }
    writeJson(settingsPath(), settings)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export function getBrandingBgImage() {
  try {
    const settings = ensureSettings()
    const fileName = settings?.branding?.bgImageFile
    if (!fileName) return { data: null }
    const filePath = path.join(brandingAssetsDir(), fileName)
    if (!fs.existsSync(filePath)) return { data: null }
    const buffer = fs.readFileSync(filePath)
    const ext = path.extname(fileName).toLowerCase()
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg'
    return { data: `data:${mime};base64,${buffer.toString('base64')}` }
  } catch {
    return { data: null }
  }
}

export function deleteBrandingBgImage() {
  try {
    const dir = brandingAssetsDir()
    fs.readdirSync(dir).filter(f => f.startsWith('bg-image.')).forEach(f => {
      fs.unlinkSync(path.join(dir, f))
    })
    const settings = ensureSettings()
    settings.branding = { ...settings.branding, bgImageFile: '' }
    writeJson(settingsPath(), settings)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ── Voucher Validation ───────────────────────────────────────────────────────

export function validateVoucher(code) {
  try {
    const list = readJson(vouchersPath(), [])
    const voucher = list.find(v => v.code === code)
    if (!voucher) return { valid: false, error: 'Kode tidak ditemukan' }

    const now = new Date()
    if (voucher.expiresAt && new Date(voucher.expiresAt) < now) {
      return { valid: false, error: 'Voucher sudah kadaluarsa' }
    }
    if (voucher.maxUse > 0 && voucher.usedCount >= voucher.maxUse) {
      return { valid: false, error: 'Voucher sudah habis dipakai' }
    }

    // Increment usedCount
    voucher.usedCount = (voucher.usedCount ?? 0) + 1
    saveVoucher(voucher)

    return { valid: true, type: voucher.type, discount: voucher.discount ?? 0 }
  } catch (err) {
    return { valid: false, error: err.message }
  }
}
