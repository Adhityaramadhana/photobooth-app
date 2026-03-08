import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'

// ── Mode flags ────────────────────────────────────────────────────────────────
// WEBCAM_MODE : pakai webcam MacBook/PC — best untuk dev/testing (getUserMedia)
// MOCK_MODE   : picsum foto statis, tidak butuh kamera apapun
// (keduanya false) : kamera DSLR real via digiCamControl
const WEBCAM_MODE = true   // ← toggle ini untuk webcam MacBook
const MOCK_MODE   = false  // ← toggle ini untuk picsum mock statis

const BASE_URL = 'http://localhost:5513'

let healthCheckInterval = null
let failCount = 0
let mainWindowRef = null

// ============ MOCK DATA ============
const MOCK_CAMERA_MODEL = 'Canon EOS 800D (Mock)'
const MOCK_LIVE_VIEW_URL = 'https://picsum.photos/800/1200' // portrait supaya lebih cocok
const MOCK_CAPTURE_DELAY = 2000

// ============ CAMERA FUNCTIONS ============

export async function checkService() {
  if (WEBCAM_MODE || MOCK_MODE) return { running: true, mock: true }
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/camera/list`, 5000)
    const data = await res.json()
    return { running: true, data }
  } catch (err) {
    console.error('[CAMERA] checkService error:', err.message)
    return { running: false, error: err.message }
  }
}

export async function getCameraList() {
  if (WEBCAM_MODE) return { cameras: [{ name: 'Webcam (Mock)', model: 'Built-in Webcam' }] }
  if (MOCK_MODE)   return { cameras: [{ name: 'Mock Camera', model: MOCK_CAMERA_MODEL }] }
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/camera/list`, 5000)
    const data = await res.json()
    return { cameras: data }
  } catch (err) {
    console.error('[CAMERA] getCameraList error:', err.message)
    return { cameras: [], error: err.message }
  }
}

export async function connectCamera() {
  if (WEBCAM_MODE) {
    await delay(300)
    return { success: true, model: 'Built-in Webcam', mock: true, webcam: true }
  }
  if (MOCK_MODE) {
    await delay(500)
    return { success: true, model: MOCK_CAMERA_MODEL, mock: true }
  }
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/camera/list`, 5000)
    const data = await res.json()
    if (!data || data.length === 0) {
      return { success: false, error: 'Tidak ada kamera terdeteksi' }
    }
    return { success: true, model: data[0]?.model || 'Canon DSLR' }
  } catch (err) {
    console.error('[CAMERA] connectCamera error:', err.message)
    return { success: false, error: err.message }
  }
}

export async function startLiveView() {
  // Webcam mode: renderer yang handle getUserMedia — main process cukup kasih sinyal
  if (WEBCAM_MODE) {
    return { success: true, mock: true, webcam: true }
  }
  if (MOCK_MODE) {
    return { success: true, framePath: MOCK_LIVE_VIEW_URL, mock: true }
  }
  try {
    await fetchWithTimeout(`${BASE_URL}/api/camera/liveview/start`, 5000)
    return { success: true, framePath: `${BASE_URL}/liveview.jpg` }
  } catch (err) {
    console.error('[CAMERA] startLiveView error:', err.message)
    return { success: false, error: err.message }
  }
}

export async function stopLiveView() {
  if (WEBCAM_MODE || MOCK_MODE) return { success: true }
  try {
    await fetchWithTimeout(`${BASE_URL}/api/camera/liveview/stop`, 5000)
    return { success: true }
  } catch (err) {
    console.error('[CAMERA] stopLiveView error:', err.message)
    return { success: false, error: err.message }
  }
}

export async function capturePhoto(outputDir) {
  if (MOCK_MODE) {
    await delay(MOCK_CAPTURE_DELAY)
    const destPath = path.join(outputDir, `capture-${Date.now()}.jpg`)
    const samplePath = path.join(__dirname, '../../resources/mock/sample-capture.jpg')
    fs.mkdirSync(outputDir, { recursive: true })
    fs.copyFileSync(samplePath, destPath)
    return { success: true, filePath: destPath, mock: true }
  }

  // WEBCAM_MODE: capture dilakukan di renderer (saveWebcamFrame), tidak lewat sini
  if (WEBCAM_MODE) {
    return { success: false, error: 'Gunakan camera:saveWebcamFrame untuk webcam mode' }
  }

  try {
    await fetchWithTimeout(`${BASE_URL}/api/camera/capture`, 15000)
    const imgRes = await fetchWithTimeout(`${BASE_URL}/api/camera/capturedimage`, 10000)
    const buffer = await imgRes.buffer()
    fs.mkdirSync(outputDir, { recursive: true })
    const filePath = path.join(outputDir, `capture-${Date.now()}.jpg`)
    fs.writeFileSync(filePath, buffer)
    return { success: true, filePath }
  } catch (err) {
    console.error('[CAMERA] capturePhoto error:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Webcam capture: renderer canvas.toDataURL() → kirim base64 ke sini → simpan ke disk.
 * Return { success, filePath } — format sama dengan capturePhoto() supaya flow tidak berubah.
 */
export async function saveWebcamFrame(outputDir, base64Data) {
  try {
    // Strip data URI prefix kalau ada
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')
    fs.mkdirSync(outputDir, { recursive: true })
    const filePath = path.join(outputDir, `capture-${Date.now()}.jpg`)
    fs.writeFileSync(filePath, buffer)
    console.log('[CAMERA] Webcam frame saved:', filePath)
    return { success: true, filePath }
  } catch (err) {
    console.error('[CAMERA] saveWebcamFrame error:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Simpan satu frame live view ke disk untuk GIF/Boomerang.
 * Path: {outputDir}/live-frames/photo-{photoIndex}/frame-{frameIndex}.jpg
 */
export function saveLiveFrame(outputDir, base64Data, photoIndex, frameIndex) {
  try {
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')
    const dir = path.join(outputDir, 'live-frames', `photo-${photoIndex}`)
    fs.mkdirSync(dir, { recursive: true })
    const filePath = path.join(dir, `frame-${String(frameIndex).padStart(4, '0')}.jpg`)
    fs.writeFileSync(filePath, buffer)
    return { success: true, filePath }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export function startHealthCheck(mainWindow) {
  if (WEBCAM_MODE || MOCK_MODE) return // tidak perlu health check di mock/webcam mode
  mainWindowRef = mainWindow
  failCount = 0
  healthCheckInterval = setInterval(async () => {
    const result = await checkService()
    if (!result.running) {
      failCount++
      console.warn(`[CAMERA] Health check fail ${failCount}/3`)
      if (failCount >= 3) {
        stopHealthCheck()
        mainWindowRef?.webContents.send('camera:disconnected')
      }
    } else {
      failCount = 0
    }
  }, 3000)
}

export function stopHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  }
  failCount = 0
}

// ============ HELPERS ============

function fetchWithTimeout(url, timeout = 10000) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ])
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
