import fs from 'fs'
import path from 'path'
import { app } from 'electron'

/**
 * Scan resources/frames/ for categories and frame files.
 * Returns: { categories: [{ name, frames: [{ name, path }] }] }
 */
export function getFrameCategories() {
  const framesDir = path.join(__dirname, '../../resources/frames')

  if (!fs.existsSync(framesDir)) {
    return { categories: [] }
  }

  const categories = fs.readdirSync(framesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(dir => {
      const catPath = path.join(framesDir, dir.name)
      const frames = fs.readdirSync(catPath)
        .filter(f => f.toLowerCase().endsWith('.png'))
        .map(f => ({
          name: path.basename(f, '.png'),
          path: path.join(catPath, f)
        }))
      return { name: dir.name, frames }
    })
    .filter(cat => cat.frames.length > 0)

  return { categories }
}

/**
 * Read a frame PNG file and return as base64 data URL.
 */
export function getFrameFile(framePath) {
  try {
    if (!fs.existsSync(framePath)) {
      return { error: `File not found: ${framePath}` }
    }
    const buffer = fs.readFileSync(framePath)
    const base64 = buffer.toString('base64')
    return { data: `data:image/png;base64,${base64}` }
  } catch (err) {
    console.error('[EDITOR] getFrameFile error:', err.message)
    return { error: err.message }
  }
}

/**
 * Save edited photo (base64 JPEG) to session folder.
 */
export function saveEditedPhoto(base64Data, sessionId) {
  try {
    const sessionsDir = path.join(app.getPath('userData'), 'sessions', sessionId)
    fs.mkdirSync(sessionsDir, { recursive: true })

    const filePath = path.join(sessionsDir, 'edited.jpg')

    // Strip data URL prefix if present
    const raw = base64Data.replace(/^data:image\/\w+;base64,/, '')
    fs.writeFileSync(filePath, Buffer.from(raw, 'base64'))

    return { success: true, filePath }
  } catch (err) {
    console.error('[EDITOR] saveEditedPhoto error:', err.message)
    return { success: false, error: err.message }
  }
}
