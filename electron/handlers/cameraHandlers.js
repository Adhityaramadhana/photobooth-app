import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'

const MOCK_MODE = true // ← ganti false kalau kamera sudah siap
const BASE_URL = 'http://localhost:5513'

let healthCheckInterval = null
let failCount = 0
let mainWindowRef = null

// ============ MOCK DATA ============
const MOCK_CAMERA_MODEL = 'Canon EOS 800D (Mock)'
const MOCK_LIVE_VIEW_URL = 'https://picsum.photos/1280/800'
const MOCK_CAPTURE_DELAY = 2000 // simulasi waktu capture 2 detik

// ============ REAL FUNCTIONS ============

export async function checkService() {
  if (MOCK_MODE) return { running: true, mock: true }
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
  if (MOCK_MODE) return { cameras: [{ name: 'Mock Camera', model: MOCK_CAMERA_MODEL }] }
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
  if (MOCK_MODE) {
    return {
      success: true,
      framePath: MOCK_LIVE_VIEW_URL,
      mock: true
    }
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
  if (MOCK_MODE) return { success: true }
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
    // Copy sample photo ke outputDir
    const destPath = path.join(outputDir, `capture-${Date.now()}.jpg`)
    const samplePath = path.join(__dirname, '../../resources/mock/sample-capture.jpg')

    fs.mkdirSync(outputDir, { recursive: true })
    fs.copyFileSync(samplePath, destPath)
    return { success: true, filePath: destPath, mock: true }
  }

  try {
    // Trigger capture
    await fetchWithTimeout(`${BASE_URL}/api/camera/capture`, 15000)
    // Download hasil foto
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

export function startHealthCheck(mainWindow) {
  if (MOCK_MODE) return // tidak perlu health check di mock mode

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
